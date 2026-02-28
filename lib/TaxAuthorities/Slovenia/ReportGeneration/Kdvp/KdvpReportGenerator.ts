import type { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import type { LotMatchingConfiguration } from "@brrr/Core/Schemas/LotMatchingConfiguration.ts";
import { GenericCategory, GenericTradeReportItemGainType } from "@brrr/Core/Schemas/CommonFormats.ts";
import { TradeEventStockAcquired, type TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";
import { FifoLotMatchingMethod } from "@brrr/Core/LotMatching/FifoLotMatchingMethod.ts";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import type { EDavkiDocumentWorkflowType } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.ts";
import {
	EDavkiGenericTradeReportItem,
	EDavkiTradeReportGainType,
	EDavkiTradeReportSecurityLineEvent,
	EDavkiTradeReportSecurityLineGenericEventBought,
	EDavkiTradeReportSecurityLineGenericEventSold,
	EDavkiTradeSecurityType,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas.ts";
import { generateXmlReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/XmlDohKdvp.ts";
import { generateCsvReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/CsvDohKdvp.ts";

const GAIN_MAPPINGS: Record<string, EDavkiTradeReportGainType> = {
	[GenericTradeReportItemGainType.BOUGHT]: EDavkiTradeReportGainType.BOUGHT,
	[GenericTradeReportItemGainType.CAPITAL_INVESTMENT]: EDavkiTradeReportGainType.CAPITAL_INVESTMENT,
	[GenericTradeReportItemGainType.CAPITAL_RAISE]: EDavkiTradeReportGainType.CAPITAL_RAISE,
	[GenericTradeReportItemGainType.CAPITAL_ASSET]: EDavkiTradeReportGainType.CAPITAL_ASSET_RAISE,
	[GenericTradeReportItemGainType.CAPITALIZATION_CHANGE]: EDavkiTradeReportGainType.CAPITALIZATION_CHANGE,
	[GenericTradeReportItemGainType.INHERITENCE]: EDavkiTradeReportGainType.INHERITENCE,
	[GenericTradeReportItemGainType.GIFT]: EDavkiTradeReportGainType.GIFT,
	[GenericTradeReportItemGainType.OTHER]: EDavkiTradeReportGainType.OTHER,
	[GenericTradeReportItemGainType.RIGHT_TO_NEWLY_ISSUED_STOCK]: EDavkiTradeReportGainType.OTHER,
};

function convertStockBuy(line: TradeEventStockAcquired): EDavkiTradeReportSecurityLineGenericEventBought {
	return new EDavkiTradeReportSecurityLineGenericEventBought({
		boughtOn: line.date,
		gainType: GAIN_MAPPINGS[line.acquiredReason] ?? EDavkiTradeReportGainType.OTHER,
		quantity: line.exchangedMoney.underlyingQuantity,
		pricePerUnit: line.exchangedMoney.underlyingTradePrice,
		pricePerUnitInOriginalCurrency: line.exchangedMoney.underlyingTradePrice * (1 / line.exchangedMoney.fxRateToBase),
		totalPrice: line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice,
		totalPriceInOriginalCurrency: line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice *
			(1 / line.exchangedMoney.fxRateToBase),
		commissions: line.exchangedMoney.comissionTotal,
		commissionsInOriginalCurrency: line.exchangedMoney.comissionTotal * (1 / line.exchangedMoney.fxRateToBase),
		inheritanceAndGiftTaxPaid: null,
		baseTaxReduction: null,
	});
}

function convertStockSell(line: TradeEventStockSold): EDavkiTradeReportSecurityLineGenericEventSold {
	return new EDavkiTradeReportSecurityLineGenericEventSold({
		soldOn: line.date,
		quantity: line.exchangedMoney.underlyingQuantity,
		pricePerUnit: line.exchangedMoney.underlyingTradePrice,
		pricePerUnitInOriginalCurrency: line.exchangedMoney.underlyingTradePrice * (1 / line.exchangedMoney.fxRateToBase),
		totalPrice: line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice,
		totalPriceInOriginalCurrency: line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice *
			(1 / line.exchangedMoney.fxRateToBase),
		commissions: line.exchangedMoney.comissionTotal,
		commissionsInOriginalCurrency: line.exchangedMoney.comissionTotal * (1 / line.exchangedMoney.fxRateToBase),
		satisfiesTaxBasisReduction: false,
	});
}

export class KdvpReportGenerator {
	constructor(private readonly processor: FinancialEventsProcessor) {}

	convert(config: TaxAuthorityConfiguration, groupings: FinancialGrouping[]): EDavkiGenericTradeReportItem[] {
		const converted: EDavkiGenericTradeReportItem[] = [];
		const periodStart = config.fromDate;
		const periodEnd = config.toDate;

		for (const isinGrouping of groupings) {
			const isin = isinGrouping.financialIdentifier.getIsin();

			const lotMatchingConfiguration: LotMatchingConfiguration = {
				fromDate: periodStart,
				toDate: periodEnd,
				forStocks: (_grouping) => {
					if (config.lotMatchingMethod === TaxAuthorityLotMatchingMethod.PROVIDED) {
						return new ProvidedLotMatchingMethod(isinGrouping.stockTaxLots);
					}
					return new FifoLotMatchingMethod();
				},
				forDerivatives: (_grouping) => {
					if (config.lotMatchingMethod === TaxAuthorityLotMatchingMethod.PROVIDED) {
						return new ProvidedLotMatchingMethod([]);
					}
					return new FifoLotMatchingMethod();
				},
			};

			const interestingGrouping = this.processor.process(isinGrouping, lotMatchingConfiguration);

			const allLines = [...interestingGrouping.stockTrades];
			allLines.sort((a, b) => a.date.toMillis() - b.date.toMillis());

			if (allLines.length === 0) {
				continue;
			}

			const convertedLines = allLines.map((line) => {
				if (line instanceof TradeEventStockAcquired) return convertStockBuy(line);
				return convertStockSell(line);
			});

			const isTrustFund = isinGrouping.underlyingCategory === GenericCategory.TRUST_FUND;

			const tickerSymbols = allLines.map((line) => line.financialIdentifier.getTicker()).pop() ?? null;

			const reportItem = new EDavkiTradeReportSecurityLineEvent({
				isin: isin ?? "",
				code: tickerSymbols,
				name: null,
				isFund: isTrustFund,
				resolution: null,
				resolutionDate: null,
				events: convertedLines,
			});

			const foreignTaxPaidSum = allLines.reduce((sum, e) => sum + (e.exchangedMoney.taxTotal ?? 0), 0);
			let foreignTaxPaid: number | null = foreignTaxPaidSum;
			let hasForeignTax = true;
			if (foreignTaxPaidSum <= 0) {
				foreignTaxPaid = null;
				hasForeignTax = false;
			}

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
