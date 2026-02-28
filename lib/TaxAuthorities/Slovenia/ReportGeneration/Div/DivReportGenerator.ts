import type { DateTime } from "luxon";
import type { CompanyLookupProvider, CountryLookupProvider } from "@brrr/InfoProviders/InfoLookupProvider.ts";
import { TreatyType } from "@brrr/InfoProviders/InfoLookupProvider.ts";
import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import type {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
	TransactionCash,
} from "@brrr/Core/Schemas/Events.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { type EDavkiDividendReportLine, EDavkiDividendType } from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas.ts";
import { generateXmlReport } from "./XmlDohDiv.ts";
import { generateCsvReport } from "./CsvDohDiv.ts";

function filterOutCashTransactionsBasedOnDate(
	data: TransactionCash[],
	fromDateInclusive: DateTime,
	toDateExclusive: DateTime,
): TransactionCash[] {
	return data.filter(
		(line) => line.date >= fromDateInclusive && line.date < toDateExclusive,
	);
}

function processEdavkiLineItemsFromCashTransactions(
	dividendLines: (TradeEventCashTransactionDividend | TradeEventCashTransactionPaymentInLieuOfDividend)[],
	withholdingLines: (TradeEventCashTransactionWithholdingTax | TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend)[],
): EDavkiDividendReportLine[] {
	const actionToDividendMapping = new Map<string, EDavkiDividendReportLine>();

	for (const dividend of dividendLines) {
		const actionId = dividend.actionId;

		const thisDividendLine: EDavkiDividendReportLine = {
			dateReceived: dividend.date,
			taxNumberForDividendPayer: "",
			dividendPayerIdentificationNumber: dividend.financialIdentifier.getIsin() ?? "",
			dividendPayerTitle: "",
			dividendPayerAddress: "",
			dividendPayerCountryOfOrigin: "",
			dividendType: (dividend.dividendType as unknown as EDavkiDividendType) ?? EDavkiDividendType.UNKNOWN,
			countryOfOrigin: "",
			dividendIdentifierForTracking: actionId,
			taxReliefParagraphInInternationalTreaty: "",
			dividendAmount: dividend.exchangedMoney.underlyingQuantity * dividend.exchangedMoney.underlyingTradePrice,
			dividendAmountInOriginalCurrency: dividend.exchangedMoney.underlyingQuantity *
				dividend.exchangedMoney.underlyingTradePrice *
				(1 / dividend.exchangedMoney.fxRateToBase),
			foreignTaxPaid: dividend.exchangedMoney.taxTotal,
			foreignTaxPaidInOriginalCurrency: dividend.exchangedMoney.taxTotal * (1 / dividend.exchangedMoney.fxRateToBase),
		};

		const existing = actionToDividendMapping.get(actionId);
		if (existing === undefined) {
			actionToDividendMapping.set(actionId, thisDividendLine);
			continue;
		}

		existing.dividendAmount += dividend.exchangedMoney.underlyingQuantity * dividend.exchangedMoney.underlyingTradePrice;
		existing.dividendAmountInOriginalCurrency += dividend.exchangedMoney.underlyingQuantity *
			dividend.exchangedMoney.underlyingTradePrice *
			(1 / dividend.exchangedMoney.fxRateToBase);
	}

	for (const withheldTax of withholdingLines) {
		const actionId = withheldTax.actionId;
		const entry = actionToDividendMapping.get(actionId);
		if (entry === undefined) {
			throw new Error("Edge case where Withholding Tax has no matching Dividend Cash Transaction");
		}

		entry.foreignTaxPaid += withheldTax.exchangedMoney.underlyingQuantity * withheldTax.exchangedMoney.underlyingTradePrice;
		entry.foreignTaxPaidInOriginalCurrency += withheldTax.exchangedMoney.underlyingQuantity *
			withheldTax.exchangedMoney.underlyingTradePrice *
			(1 / withheldTax.exchangedMoney.fxRateToBase);
	}

	return [...actionToDividendMapping.values()];
}

function mergeDividendsReceivedOnSameDayForSingleIsin(
	dividends: EDavkiDividendReportLine[],
): EDavkiDividendReportLine[] {
	const segmented = new Map<string, EDavkiDividendReportLine[]>();

	const dividendsSorted = [...dividends];
	dividendsSorted.sort((a, b) => {
		const keyA = `${a.dateReceived}-${a.dividendType}-${a.dividendPayerAddress}`;
		const keyB = `${b.dateReceived}-${b.dividendType}-${b.dividendPayerAddress}`;
		return keyA.localeCompare(keyB);
	});

	for (const dividend of dividendsSorted) {
		const key = `${dividend.dateReceived}-${dividend.dividendType}-${dividend.dividendPayerAddress}`;
		const existing = segmented.get(key);
		if (existing === undefined) {
			segmented.set(key, [dividend]);
		} else {
			existing.push(dividend);
		}
	}

	const mergedDividends: EDavkiDividendReportLine[] = [];

	for (const dividendList of segmented.values()) {
		const combinedTotal = dividendList.reduce((sum, d) => sum + d.dividendAmount, 0);
		const combinedTotalInOriginalCurrency = dividendList.reduce((sum, d) => sum + d.dividendAmountInOriginalCurrency, 0);
		const combinedTotalTax = dividendList.reduce((sum, d) => sum + d.foreignTaxPaid, 0);
		const combinedTotalTaxInOriginalCurrency = dividendList.reduce((sum, d) => sum + d.foreignTaxPaidInOriginalCurrency, 0);

		const combinedTracking = dividendList.map((d) => d.dividendIdentifierForTracking).join("-");

		const generatedMerged: EDavkiDividendReportLine = {
			dateReceived: dividendList[0].dateReceived,
			taxNumberForDividendPayer: dividendList[0].taxNumberForDividendPayer,
			dividendPayerIdentificationNumber: dividendList[0].dividendPayerIdentificationNumber,
			dividendPayerTitle: dividendList[0].dividendPayerTitle,
			dividendPayerAddress: dividendList[0].dividendPayerAddress,
			dividendPayerCountryOfOrigin: dividendList[0].dividendPayerCountryOfOrigin,
			dividendType: dividendList[0].dividendType,
			countryOfOrigin: dividendList[0].countryOfOrigin,
			dividendIdentifierForTracking: combinedTracking,
			taxReliefParagraphInInternationalTreaty: dividendList[0].taxReliefParagraphInInternationalTreaty,
			dividendAmount: combinedTotal,
			dividendAmountInOriginalCurrency: combinedTotalInOriginalCurrency,
			foreignTaxPaid: combinedTotalTax,
			foreignTaxPaidInOriginalCurrency: combinedTotalTaxInOriginalCurrency,
		};

		mergedDividends.push(generatedMerged);
	}

	return mergedDividends;
}

function round(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

export class DivReportGenerator {
	constructor(
		private readonly companyLookup: CompanyLookupProvider,
		private readonly countryLookup: CountryLookupProvider,
	) {}

	convert(config: TaxAuthorityConfiguration, groupings: FinancialGrouping[]): EDavkiDividendReportLine[] {
		const allLines: EDavkiDividendReportLine[] = [];
		for (const grouping of groupings) {
			allLines.push(...this.processSingleGrouping(config, grouping));
		}
		return allLines;
	}

	private processSingleGrouping(config: TaxAuthorityConfiguration, data: FinancialGrouping): EDavkiDividendReportLine[] {
		const relevantCashTransactions = filterOutCashTransactionsBasedOnDate(
			data.cashTransactions,
			config.fromDate,
			config.toDate,
		);

		const dividendLines = relevantCashTransactions.filter(
			(line): line is TradeEventCashTransactionDividend | TradeEventCashTransactionPaymentInLieuOfDividend =>
				line.kind === "CashTransactionDividend" || line.kind === "CashTransactionPaymentInLieuOfDividend",
		);

		const withholdingTax = relevantCashTransactions.filter(
			(line): line is TradeEventCashTransactionWithholdingTax | TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend =>
				line.kind === "CashTransactionWithholdingTax" || line.kind === "CashTransactionWithholdingTaxForPaymentInLieuOfDividend",
		);

		const processedDividendLines = processEdavkiLineItemsFromCashTransactions(dividendLines, withholdingTax);
		const combinedLines = mergeDividendsReceivedOnSameDayForSingleIsin(processedDividendLines);
		return this.fillInMissingCompanyInformation(combinedLines);
	}

	private fillInMissingCompanyInformation(lines: EDavkiDividendReportLine[]): EDavkiDividendReportLine[] {
		if (lines.length === 0) {
			return lines;
		}

		const firstLine = lines[0];

		let dividendPayerTitle = "";
		let dividendPayerCountryOfOrigin = "";
		let countryOfOrigin = "";
		let dividendPayerAddress: string | null = "";
		let taxReliefParagraphInInternationalTreaty: string | null = null;

		try {
			const responsibleCompany = this.companyLookup.getCompanyInfo(firstLine.dividendPayerIdentificationNumber);

			dividendPayerTitle = responsibleCompany.longName;
			dividendPayerCountryOfOrigin = responsibleCompany.location.shortCodeCountry2;
			countryOfOrigin = responsibleCompany.location.shortCodeCountry2;
			dividendPayerAddress = `${responsibleCompany.location.address1}, ${responsibleCompany.location.city}`;

			const relevantCountry = this.countryLookup.getCountry(responsibleCompany.location.country);
			taxReliefParagraphInInternationalTreaty = relevantCountry.treaties.get(TreatyType.TaxRelief) ?? null;
		} catch (_e) {
			// Silently fail — company/country lookup is best-effort
		}

		for (const dividendLine of lines) {
			dividendLine.dividendAmount = round(dividendLine.dividendAmount, 2);
			dividendLine.dividendAmountInOriginalCurrency = round(dividendLine.dividendAmountInOriginalCurrency, 2);
			dividendLine.foreignTaxPaid = round(Math.abs(dividendLine.foreignTaxPaid), 2);
			dividendLine.foreignTaxPaidInOriginalCurrency = round(Math.abs(dividendLine.foreignTaxPaidInOriginalCurrency), 2);
			dividendLine.dividendPayerTitle = dividendPayerTitle;
			dividendLine.dividendPayerCountryOfOrigin = dividendPayerCountryOfOrigin;
			dividendLine.countryOfOrigin = countryOfOrigin;
			dividendLine.dividendPayerAddress = dividendPayerAddress;
			dividendLine.taxReliefParagraphInInternationalTreaty = taxReliefParagraphInInternationalTreaty;
		}

		return lines;
	}

	toXml(config: TaxAuthorityConfiguration, userConfig: TaxPayerInfo, selfReport: boolean, items: EDavkiDividendReportLine[]): string {
		return generateXmlReport(config, userConfig, selfReport, items);
	}

	toCsv(items: EDavkiDividendReportLine[]): Record<string, unknown>[] {
		return generateCsvReport(items);
	}
}
