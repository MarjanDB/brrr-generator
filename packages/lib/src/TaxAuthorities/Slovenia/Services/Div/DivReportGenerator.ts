import type { TradeEventCashTransaction } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransaction";
import { TradeEventCashTransactionDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionDividend";
import { TradeEventCashTransactionPaymentInLieuOfDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionPaymentInLieuOfDividend";
import { TradeEventCashTransactionWithholdingTax } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionWithholdingTax";
import { TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend";
import { DividendType } from "@brrr/Core/Models/Events/DividendType";
import type { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import { type CashActionId, Isin } from "@brrr/Core/Models/Identifiers";
import type { IInfoProvider } from "@brrr/InfoProviders/Interfaces/IInfoProvider";
import { TreatyType } from "@brrr/InfoProviders/Models/TreatyType";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/Models/TaxAuthorityConfiguration";
import type { TaxpayerInfo } from "@brrr/TaxAuthorities/Schemas/TaxpayerConfigSchema";
import { EDavkiDividendReportLine } from "@brrr/TaxAuthorities/Slovenia/Models/Div/EDavkiDividendReportLine";
import { EDavkiDividendType } from "@brrr/TaxAuthorities/Slovenia/Models/Div/EDavkiDividendType";
import {
	EDavkiCountryCode,
	EDavkiDividendTrackingId,
	EDavkiPayerIdentificationNumber,
	EDavkiTaxNumber,
} from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import { generateCsvReport } from "@brrr/TaxAuthorities/Slovenia/Services/Div/CsvDohDiv";
import { generateXmlReport } from "@brrr/TaxAuthorities/Slovenia/Services/Div/XmlDohDiv";
import { round, toOriginalCurrency } from "@brrr/TaxAuthorities/Slovenia/Utils/Amounts";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import type { DateTime } from "luxon";

const DIVIDEND_TYPE_MAPPINGS: Record<DividendType, EDavkiDividendType> = {
	[DividendType.UNKNOWN]: EDavkiDividendType.UNKNOWN,
	[DividendType.ORDINARY]: EDavkiDividendType.ORDINARY,
	[DividendType.BONUS]: EDavkiDividendType.OTHER,
	[DividendType.LIQUIDATING]: EDavkiDividendType.LIQUIDATING,
	[DividendType.OTHER]: EDavkiDividendType.OTHER,
};

type Dividend =
	| TradeEventCashTransactionDividend
	| TradeEventCashTransactionPaymentInLieuOfDividend;
type Withholding =
	| TradeEventCashTransactionWithholdingTax
	| TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend;

// What a dividend line adds up to, before the payer is looked up and the amounts are rounded.
type DividendTotals = {
	dateReceived: ValidDateTime;
	dividendType: EDavkiDividendType;
	tracking: EDavkiDividendTrackingId;
	dividendAmount: number;
	dividendAmountInOriginalCurrency: number;
	foreignTaxPaid: number;
	foreignTaxPaidInOriginalCurrency: number;
};

type Payer = {
	title: string;
	address: string;
	countryOfOrigin: EDavkiCountryCode;
	taxReliefParagraph: string | null;
};

function filterOutCashTransactionsBasedOnDate(
	data: TradeEventCashTransaction[],
	fromDateInclusive: DateTime,
	toDateExclusive: DateTime,
): TradeEventCashTransaction[] {
	return data.filter((line) => line.date >= fromDateInclusive && line.date < toDateExclusive);
}

function amountOf(transaction: TradeEventCashTransaction): number {
	return transaction.exchangedMoney.quantity * transaction.exchangedMoney.priceInBase;
}

function inOriginalCurrency(transaction: TradeEventCashTransaction, amount: number): number {
	return toOriginalCurrency(amount, transaction.exchangedMoney.fxRateToBase);
}

function sum(values: number[]): number {
	return values.reduce((total, value) => total + value);
}

// One entry per corporate action. Only the action's first dividend contributes its own tax;
// the action's withholdings add to it.
function totalsPerAction(dividends: Dividend[], withholdings: Withholding[]): DividendTotals[] {
	const byAction = new Map<CashActionId, { dividends: Dividend[]; withholdings: Withholding[] }>();
	for (const dividend of dividends) {
		const action = byAction.get(dividend.actionId);
		if (action === undefined) {
			byAction.set(dividend.actionId, { dividends: [dividend], withholdings: [] });
		} else {
			action.dividends.push(dividend);
		}
	}
	for (const withheldTax of withholdings) {
		const action = byAction.get(withheldTax.actionId);
		if (action === undefined) {
			throw new Error("Edge case where Withholding Tax has no matching Dividend Cash Transaction");
		}
		action.withholdings.push(withheldTax);
	}

	return [...byAction].map(([actionId, action]) => {
		const [first] = action.dividends;
		return {
			dateReceived: first.date,
			dividendType: DIVIDEND_TYPE_MAPPINGS[first.dividendType] ?? EDavkiDividendType.UNKNOWN,
			tracking: EDavkiDividendTrackingId.FromCashActionId(actionId),
			dividendAmount: sum(action.dividends.map(amountOf)),
			dividendAmountInOriginalCurrency: sum(
				action.dividends.map((dividend) => inOriginalCurrency(dividend, amountOf(dividend))),
			),
			foreignTaxPaid: sum([first.exchangedMoney.taxTotal, ...action.withholdings.map(amountOf)]),
			foreignTaxPaidInOriginalCurrency: sum([
				inOriginalCurrency(first, first.exchangedMoney.taxTotal),
				...action.withholdings.map((withheldTax) =>
					inOriginalCurrency(withheldTax, amountOf(withheldTax)),
				),
			]),
		};
	});
}

// Actions paid on the same day with the same dividend type become one line.
function mergeDividendsReceivedOnSameDay(totals: DividendTotals[]): DividendTotals[] {
	// The key ends where the payer's address used to go. It is always empty at this point, and
	// the separator stays so localeCompare keeps the lines in the same order.
	const keyOf = (entry: DividendTotals) => `${entry.dateReceived}-${entry.dividendType}-`;

	const sameDay = new Map<string, DividendTotals[]>();
	for (const entry of [...totals].sort((a, b) => keyOf(a).localeCompare(keyOf(b)))) {
		const existing = sameDay.get(keyOf(entry));
		if (existing === undefined) {
			sameDay.set(keyOf(entry), [entry]);
		} else {
			existing.push(entry);
		}
	}

	return [...sameDay.values()].map((entries) => ({
		dateReceived: entries[0].dateReceived,
		dividendType: entries[0].dividendType,
		tracking: EDavkiDividendTrackingId.Schema.parse(
			entries.map((entry) => entry.tracking).join("-"),
		),
		dividendAmount: entries.reduce((total, entry) => total + entry.dividendAmount, 0),
		dividendAmountInOriginalCurrency: entries.reduce(
			(total, entry) => total + entry.dividendAmountInOriginalCurrency,
			0,
		),
		foreignTaxPaid: entries.reduce((total, entry) => total + entry.foreignTaxPaid, 0),
		foreignTaxPaidInOriginalCurrency: entries.reduce(
			(total, entry) => total + entry.foreignTaxPaidInOriginalCurrency,
			0,
		),
	}));
}

export class DivReportGenerator {
	public constructor(private readonly infoProvider: IInfoProvider) {}

	public async convert(
		config: TaxAuthorityConfiguration,
		groupings: FinancialGrouping[],
	): Promise<EDavkiDividendReportLine[]> {
		const allLines: EDavkiDividendReportLine[] = [];
		for (const grouping of groupings) {
			allLines.push(...(await this.processSingleGrouping(config, grouping)));
		}
		return allLines;
	}

	private async processSingleGrouping(
		config: TaxAuthorityConfiguration,
		data: FinancialGrouping,
	): Promise<EDavkiDividendReportLine[]> {
		const relevantCashTransactions = filterOutCashTransactionsBasedOnDate(
			data.cashTransactions,
			config.fromDate,
			config.toDate,
		);

		const dividends = relevantCashTransactions.filter(
			(line): line is Dividend =>
				line instanceof TradeEventCashTransactionDividend ||
				line instanceof TradeEventCashTransactionPaymentInLieuOfDividend,
		);

		const withholdings = relevantCashTransactions.filter(
			(line): line is Withholding =>
				line instanceof TradeEventCashTransactionWithholdingTax ||
				line instanceof TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
		);

		const totals = mergeDividendsReceivedOnSameDay(totalsPerAction(dividends, withholdings));
		if (totals.length === 0) {
			return [];
		}

		const isin = data.financialIdentifier.isin ?? Isin.Schema.parse("");
		const payer = await this.lookUpPayer(isin);

		return totals.map(
			(entry) =>
				new EDavkiDividendReportLine({
					dateReceived: entry.dateReceived,
					taxNumberForDividendPayer: EDavkiTaxNumber.Schema.parse(""),
					dividendPayerIdentificationNumber: EDavkiPayerIdentificationNumber.FromIsin(isin),
					dividendPayerTitle: payer.title,
					dividendPayerAddress: payer.address,
					dividendPayerCountryOfOrigin: payer.countryOfOrigin,
					dividendType: entry.dividendType,
					countryOfOrigin: payer.countryOfOrigin,
					dividendIdentifierForTracking: entry.tracking,
					taxReliefParagraphInInternationalTreaty: payer.taxReliefParagraph,
					dividendAmount: round(entry.dividendAmount, 2),
					dividendAmountInOriginalCurrency: round(entry.dividendAmountInOriginalCurrency, 2),
					foreignTaxPaid: round(Math.abs(entry.foreignTaxPaid), 2),
					foreignTaxPaidInOriginalCurrency: round(
						Math.abs(entry.foreignTaxPaidInOriginalCurrency),
						2,
					),
				}),
		);
	}

	private async lookUpPayer(isin: Isin): Promise<Payer> {
		let title = "";
		let address = "";
		let countryOfOrigin = EDavkiCountryCode.Schema.parse("");
		let taxReliefParagraph: string | null = null;

		try {
			const responsibleCompany = await this.infoProvider.getCompanyInfo(isin);

			if (responsibleCompany !== null) {
				title = responsibleCompany.longName;
				countryOfOrigin = EDavkiCountryCode.FromCountryCode(
					responsibleCompany.location.shortCodeCountry2,
				);
				address = `${responsibleCompany.location.address1}, ${responsibleCompany.location.city}`;

				const relevantCountry = await this.infoProvider.getCountry(
					responsibleCompany.location.country,
				);
				taxReliefParagraph = relevantCountry?.treaties.get(TreatyType.TaxRelief) ?? null;
			}
		} catch (_e) {
			// Silently fail — company/country lookup is best-effort
		}

		return { title, address, countryOfOrigin, taxReliefParagraph };
	}

	public toXml(
		config: TaxAuthorityConfiguration,
		userConfig: TaxpayerInfo,
		selfReport: boolean,
		items: EDavkiDividendReportLine[],
	): string {
		return generateXmlReport(config, userConfig, selfReport, items);
	}

	public toCsv(items: EDavkiDividendReportLine[]): string {
		return generateCsvReport(items);
	}
}
