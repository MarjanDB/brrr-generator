import type { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { Category, GenericTradeReportItemGainType } from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired, type TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type {
	TaxAuthorityConfiguration,
	TaxpayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import { createLotMatchingMethod } from "@brrr/TaxAuthorities/LotMatchingMethodFactory";
import {
	foreignTaxOf,
	toOriginalCurrency,
} from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Amounts";
import { generateCsvReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/CsvDohKdvp";
import { generateXmlReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/XmlDohKdvp";
import {
	EDavkiIsin,
	EDavkiSecurityCode,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/EDavkiIdentifiers";
import type { EDavkiDocumentWorkflowType } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import {
	EDavkiGenericTradeReportItem,
	EDavkiTradeReportGainType,
	EDavkiTradeReportSecurityLineEvent,
	EDavkiTradeReportSecurityLineGenericEventBought,
	EDavkiTradeReportSecurityLineGenericEventSold,
	EDavkiTradeSecurityType,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";

const GAIN_MAPPINGS: Record<GenericTradeReportItemGainType, EDavkiTradeReportGainType> = {
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
	trade: TradeEventStockAcquired,
	quantity: number,
	commission: number,
): EDavkiTradeReportSecurityLineGenericEventBought {
	return new EDavkiTradeReportSecurityLineGenericEventBought({
		boughtOn: trade.date,
		gainType: GAIN_MAPPINGS[trade.acquiredReason] ?? EDavkiTradeReportGainType.OTHER,
		quantity: quantity,
		pricePerUnit: trade.exchangedMoney.priceInBase,
		pricePerUnitInOriginalCurrency: toOriginalCurrency(
			trade.exchangedMoney.priceInBase,
			trade.exchangedMoney.fxRateToBase,
		),
		totalPrice: quantity * trade.exchangedMoney.priceInBase,
		totalPriceInOriginalCurrency: toOriginalCurrency(
			quantity * trade.exchangedMoney.priceInBase,
			trade.exchangedMoney.fxRateToBase,
		),
		commissions: commission,
		commissionsInOriginalCurrency: toOriginalCurrency(
			commission,
			trade.exchangedMoney.fxRateToBase,
		),
		inheritanceAndGiftTaxPaid: null,
		baseTaxReduction: null,
	});
}

function convertStockSell(
	trade: TradeEventStockSold,
	quantity: number,
	commission: number,
): EDavkiTradeReportSecurityLineGenericEventSold {
	return new EDavkiTradeReportSecurityLineGenericEventSold({
		soldOn: trade.date,
		quantity: quantity,
		pricePerUnit: trade.exchangedMoney.priceInBase,
		pricePerUnitInOriginalCurrency: toOriginalCurrency(
			trade.exchangedMoney.priceInBase,
			trade.exchangedMoney.fxRateToBase,
		),
		totalPrice: quantity * trade.exchangedMoney.priceInBase,
		totalPriceInOriginalCurrency: toOriginalCurrency(
			quantity * trade.exchangedMoney.priceInBase,
			trade.exchangedMoney.fxRateToBase,
		),
		commissions: commission,
		commissionsInOriginalCurrency: toOriginalCurrency(
			commission,
			trade.exchangedMoney.fxRateToBase,
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
			const { isin, ticker } = isinGrouping.financialIdentifier; // TODO: Security line has 3 possible identifiers, not just isin

			const legs = this.processor.stockLotLegsClosedInPeriod(
				isinGrouping,
				createLotMatchingMethod(config.lotMatchingMethod, isinGrouping.stockTaxLots),
				periodStart,
				periodEnd,
			);

			if (legs.length === 0) {
				continue;
			}

			const convertedLines = legs.map(({ trade, quantity, commission }) => {
				if (trade instanceof TradeEventStockAcquired)
					return convertStockBuy(trade, quantity, commission);
				return convertStockSell(trade, quantity, commission);
			});

			const isTrustFund = isinGrouping.underlyingCategory === Category.TRUST_FUND;

			const reportItem = new EDavkiTradeReportSecurityLineEvent({
				isin: isin === null ? EDavkiIsin.Schema.parse("") : EDavkiIsin.FromIsin(isin),
				code: ticker === null ? null : EDavkiSecurityCode.FromTicker(ticker),
				name: null,
				isFund: isTrustFund,
				resolution: null,
				resolutionDate: null,
				events: convertedLines,
			});

			// Counts a trade's whole tax once for every lot it falls into; kept so the reports don't change.
			const { hasForeignTax, foreignTax: foreignTaxPaid } = foreignTaxOf(
				legs.map((leg) => leg.trade),
			);

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
		userConfig: TaxpayerInfo,
		documentType: EDavkiDocumentWorkflowType,
		items: EDavkiGenericTradeReportItem[],
	): string {
		return generateXmlReport(config, userConfig, documentType, items);
	}

	toCsv(items: EDavkiGenericTradeReportItem[]): string {
		return generateCsvReport(items);
	}
}
