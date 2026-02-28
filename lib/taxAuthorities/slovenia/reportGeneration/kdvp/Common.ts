import type { FinancialGrouping } from "@brrr/core/schemas/Grouping.ts";
import type { LotMatchingConfiguration } from "@brrr/core/schemas/LotMatchingConfiguration.ts";
import { GenericCategory, GenericTradeReportItemGainType } from "@brrr/core/schemas/CommonFormats.ts";
import type { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/core/schemas/Events.ts";
import { FifoLotMatchingMethod } from "@brrr/core/lotMatching/FifoLotMatchingMethod.ts";
import { ProvidedLotMatchingMethod } from "@brrr/core/lotMatching/ProvidedLotMatchingMethod.ts";
import type { FinancialEventsProcessor } from "@brrr/core/financialEvents/FinancialEventsProcessor.ts";
import type { TaxAuthorityConfiguration } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import { TaxAuthorityLotMatchingMethod } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import {
	type EDavkiGenericTradeReportItem,
	EDavkiTradeReportGainType,
	type EDavkiTradeReportSecurityLineEvent,
	type EDavkiTradeReportSecurityLineGenericEventBought,
	type EDavkiTradeReportSecurityLineGenericEventSold,
	EDavkiTradeSecurityType,
} from "@brrr/taxAuthorities/slovenia/schemas/Schemas.ts";

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
	return {
		kind: "Bought",
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
	};
}

function convertStockSell(line: TradeEventStockSold): EDavkiTradeReportSecurityLineGenericEventSold {
	return {
		kind: "Sold",
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
	};
}

export function convertTradesToKdvpItems(
	reportConfig: TaxAuthorityConfiguration,
	data: FinancialGrouping[],
	countedProcessor: FinancialEventsProcessor,
): EDavkiGenericTradeReportItem[] {
	const converted: EDavkiGenericTradeReportItem[] = [];
	const periodStart = reportConfig.fromDate;
	const periodEnd = reportConfig.toDate;

	for (const isinGrouping of data) {
		const isin = isinGrouping.financialIdentifier.getIsin();

		const lotMatchingConfiguration: LotMatchingConfiguration = {
			fromDate: periodStart,
			toDate: periodEnd,
			forStocks: (_grouping) => {
				if (reportConfig.lotMatchingMethod === TaxAuthorityLotMatchingMethod.PROVIDED) {
					return new ProvidedLotMatchingMethod(isinGrouping.stockTaxLots);
				}
				return new FifoLotMatchingMethod();
			},
			forDerivatives: (_grouping) => {
				if (reportConfig.lotMatchingMethod === TaxAuthorityLotMatchingMethod.PROVIDED) {
					return new ProvidedLotMatchingMethod([]);
				}
				return new FifoLotMatchingMethod();
			},
		};

		const interestingGrouping = countedProcessor.process(isinGrouping, lotMatchingConfiguration);

		const allLines = [...interestingGrouping.stockTrades];
		allLines.sort((a, b) => a.date.toMillis() - b.date.toMillis());

		if (allLines.length === 0) {
			continue;
		}

		const convertedLines = allLines.map((line) => {
			if (line.kind === "StockAcquired") return convertStockBuy(line);
			return convertStockSell(line);
		});

		const isTrustFund = isinGrouping.underlyingCategory === GenericCategory.TRUST_FUND;

		const tickerSymbols = allLines.map((line) => line.financialIdentifier.getTicker()).pop() ?? null;

		const reportItem: EDavkiTradeReportSecurityLineEvent = {
			isin: isin ?? "",
			code: tickerSymbols,
			name: null,
			isFund: isTrustFund,
			resolution: null,
			resolutionDate: null,
			events: convertedLines,
		};

		const foreignTaxPaidSum = allLines.reduce((sum, e) => sum + (e.exchangedMoney.taxTotal ?? 0), 0);
		let foreignTaxPaid: number | null = foreignTaxPaidSum;
		let hasForeignTax = true;
		if (foreignTaxPaidSum <= 0) {
			foreignTaxPaid = null;
			hasForeignTax = false;
		}

		const isinEntry: EDavkiGenericTradeReportItem = {
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
		};

		converted.push(isinEntry);
	}

	return converted;
}
