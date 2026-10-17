import type { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { GenericCategory, GenericTradeReportItemGainType } from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired, type TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type {
	TaxAuthorityConfiguration,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import { createLotMatchingMethod } from "@brrr/TaxAuthorities/LotMatchingMethodFactory";
import {
	foreignTaxOf,
	toOriginalCurrency,
} from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Amounts";
import { generateCsvReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/CsvDohKdvp";
import { generateXmlReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/XmlDohKdvp";
import type { EDavkiDocumentWorkflowType } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import {
	EDavkiGenericTradeReportItem,
	EDavkiTradeReportGainType,
	EDavkiTradeReportSecurityLineEvent,
	EDavkiTradeReportSecurityLineGenericEventBought,
	EDavkiTradeReportSecurityLineGenericEventSold,
	EDavkiTradeSecurityType,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";

const GAIN_MAPPINGS: Record<string, EDavkiTradeReportGainType> = {
	[GenericTradeReportItemGainType.BOUGHT]: EDavkiTradeReportGainType.BOUGHT,
	[GenericTradeReportItemGainType.CAPITAL_INVESTMENT]: EDavkiTradeReportGainType.CAPITAL_INVESTMENT,
	[GenericTradeReportItemGainType.CAPITAL_RAISE]: EDavkiTradeReportGainType.CAPITAL_RAISE,
	[GenericTradeReportItemGainType.CAPITAL_ASSET]: EDavkiTradeReportGainType.CAPITAL_ASSET_RAISE,
	[GenericTradeReportItemGainType.CAPITALIZATION_CHANGE]:
		EDavkiTradeReportGainType.CAPITALIZATION_CHANGE,
	[GenericTradeReportItemGainType.INHERITANCE]: EDavkiTradeReportGainType.INHERITANCE,
	[GenericTradeReportItemGainType.GIFT]: EDavkiTradeReportGainType.GIFT,
	[GenericTradeReportItemGainType.OTHER]: EDavkiTradeReportGainType.OTHER,
	[GenericTradeReportItemGainType.RIGHT_TO_NEWLY_ISSUED_STOCK]: EDavkiTradeReportGainType.OTHER,
};

function convertStockBuy(
	line: TradeEventStockAcquired,
): EDavkiTradeReportSecurityLineGenericEventBought {
	return new EDavkiTradeReportSecurityLineGenericEventBought({
		boughtOn: line.date,
		gainType: GAIN_MAPPINGS[line.acquiredReason] ?? EDavkiTradeReportGainType.OTHER,
		quantity: line.exchangedMoney.underlyingQuantity,
		pricePerUnit: line.exchangedMoney.underlyingTradePrice,
		pricePerUnitInOriginalCurrency: toOriginalCurrency(
			line.exchangedMoney.underlyingTradePrice,
			line.exchangedMoney.fxRateToBase,
		),
		totalPrice: line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice,
		totalPriceInOriginalCurrency: toOriginalCurrency(
			line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice,
			line.exchangedMoney.fxRateToBase,
		),
		commissions: line.exchangedMoney.commissionTotal,
		commissionsInOriginalCurrency: toOriginalCurrency(
			line.exchangedMoney.commissionTotal,
			line.exchangedMoney.fxRateToBase,
		),
		inheritanceAndGiftTaxPaid: null,
		baseTaxReduction: null,
	});
}

function convertStockSell(
	line: TradeEventStockSold,
): EDavkiTradeReportSecurityLineGenericEventSold {
	return new EDavkiTradeReportSecurityLineGenericEventSold({
		soldOn: line.date,
		quantity: line.exchangedMoney.underlyingQuantity,
		pricePerUnit: line.exchangedMoney.underlyingTradePrice,
		pricePerUnitInOriginalCurrency: toOriginalCurrency(
			line.exchangedMoney.underlyingTradePrice,
			line.exchangedMoney.fxRateToBase,
		),
		totalPrice: line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice,
		totalPriceInOriginalCurrency: toOriginalCurrency(
			line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice,
			line.exchangedMoney.fxRateToBase,
		),
		commissions: line.exchangedMoney.commissionTotal,
		commissionsInOriginalCurrency: toOriginalCurrency(
			line.exchangedMoney.commissionTotal,
			line.exchangedMoney.fxRateToBase,
		),
		satisfiesTaxBasisReduction: false, // TODO: Wash sale handling
	});
}

export class KdvpReportGenerator {
	constructor(private readonly processor: FinancialEventsProcessor) {}

	convert(
		config: TaxAuthorityConfiguration,
		groupings: FinancialGrouping[],
	): EDavkiGenericTradeReportItem[] {
		const converted: EDavkiGenericTradeReportItem[] = [];
		const periodStart = config.fromDate;
		const periodEnd = config.toDate;

		for (const isinGrouping of groupings) {
			const isin = isinGrouping.financialIdentifier.isin; // TODO: Security line has 3 possible identifiers, not just isin

			const allLines = this.processor.stockTradesClosedInPeriod(
				isinGrouping,
				createLotMatchingMethod(config.lotMatchingMethod, isinGrouping.stockTaxLots),
				periodStart,
				periodEnd,
			);
			allLines.sort((a, b) => a.date.toMillis() - b.date.toMillis());

			if (allLines.length === 0) {
				continue;
			}

			const convertedLines = allLines.map((line) => {
				if (line instanceof TradeEventStockAcquired) return convertStockBuy(line);
				return convertStockSell(line);
			});

			const isTrustFund = isinGrouping.underlyingCategory === GenericCategory.TRUST_FUND;

			const tickerSymbols = allLines.map((line) => line.financialIdentifier.ticker).pop() ?? null; // TODO: Maybe something better than just taking the last one?

			const reportItem = new EDavkiTradeReportSecurityLineEvent({
				isin: isin ?? "",
				code: tickerSymbols,
				name: null,
				isFund: isTrustFund,
				resolution: null,
				resolutionDate: null,
				events: convertedLines,
			});

			const { hasForeignTax, foreignTax: foreignTaxPaid } = foreignTaxOf(allLines);

			const isinEntry = new EDavkiGenericTradeReportItem({
				itemId: null,
				inventoryListType: EDavkiTradeSecurityType.SECURITY,
				name: null,
				hasForeignTax,
				foreignTax: foreignTaxPaid,
				ftCountryId: null,
				ftCountryName: null,
				hasLossTransfer: null,
				foreignTransfer: null,
				taxDecreaseConformance: false,
				items: [reportItem],
			});

			converted.push(isinEntry);
		}

		return converted;
	}

	toXml(
		config: TaxAuthorityConfiguration,
		userConfig: TaxPayerInfo,
		documentType: EDavkiDocumentWorkflowType,
		items: EDavkiGenericTradeReportItem[],
	): string {
		return generateXmlReport(config, userConfig, documentType, items);
	}

	toCsv(items: EDavkiGenericTradeReportItem[]): string {
		return generateCsvReport(items);
	}
}
