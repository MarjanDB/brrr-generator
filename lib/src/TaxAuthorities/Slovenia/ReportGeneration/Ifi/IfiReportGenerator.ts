import type { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { FifoLotMatchingMethod } from "@brrr/Core/LotMatching/FifoLotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import { GenericDerivativeReportItemGainType } from "@brrr/Core/Schemas/CommonFormats";
import {
	TradeEventDerivativeAcquired,
	type TradeEventDerivativeSold,
} from "@brrr/Core/Schemas/Events";
import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type { LotMatchingConfiguration } from "@brrr/Core/Schemas/LotMatchingConfiguration";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { generateCsvReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/CsvDIfi";
import { generateXmlReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/XmlDIfi";
import {
	EDavkiDerivativeReportGainType,
	EDavkiDerivativeReportItemType,
	EDavkiDerivativeReportSecurityLineGenericEventBought,
	EDavkiDerivativeReportSecurityLineGenericEventSold,
	EDavkiDerivativeSecurityType,
	EDavkiGenericDerivativeReportItem,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";

const GAIN_MAPPINGS: Record<string, EDavkiDerivativeReportGainType> = {
	[GenericDerivativeReportItemGainType.BOUGHT]: EDavkiDerivativeReportGainType.BOUGHT,
	[GenericDerivativeReportItemGainType.CAPITAL_INVESTMENT]: EDavkiDerivativeReportGainType.OTHER,
	[GenericDerivativeReportItemGainType.CAPITAL_RAISE]: EDavkiDerivativeReportGainType.OTHER,
	[GenericDerivativeReportItemGainType.CAPITAL_ASSET]: EDavkiDerivativeReportGainType.OTHER,
	[GenericDerivativeReportItemGainType.CAPITALIZATION_CHANGE]: EDavkiDerivativeReportGainType.OTHER,
	[GenericDerivativeReportItemGainType.INHERITENCE]: EDavkiDerivativeReportGainType.INHERITENCE,
	[GenericDerivativeReportItemGainType.GIFT]: EDavkiDerivativeReportGainType.GIFT,
	[GenericDerivativeReportItemGainType.OTHER]: EDavkiDerivativeReportGainType.OTHER,
};

function convertBuy(
	trade: TradeEventDerivativeAcquired,
	quantity: number,
	commission: number,
): EDavkiDerivativeReportSecurityLineGenericEventBought {
	return new EDavkiDerivativeReportSecurityLineGenericEventBought({
		boughtOn: trade.date,
		gainType: GAIN_MAPPINGS[trade.acquiredReason] ?? EDavkiDerivativeReportGainType.OTHER,
		quantity: quantity,
		pricePerUnit: trade.exchangedMoney.underlyingTradePrice * trade.multiplier,
		pricePerUnitInOriginalCurrency:
			trade.exchangedMoney.underlyingTradePrice *
			trade.multiplier *
			(1 / trade.exchangedMoney.fxRateToBase),
		totalPrice: quantity * trade.exchangedMoney.underlyingTradePrice * trade.multiplier,
		totalPriceInOriginalCurrency:
			quantity *
			trade.exchangedMoney.underlyingTradePrice *
			trade.multiplier *
			(1 / trade.exchangedMoney.fxRateToBase),
		commissions: commission,
		commissionsInOriginalCurrency: commission * (1 / trade.exchangedMoney.fxRateToBase),
		leveraged: false,
	});
}

function convertSell(
	trade: TradeEventDerivativeSold,
	quantity: number,
	commission: number,
): EDavkiDerivativeReportSecurityLineGenericEventSold {
	return new EDavkiDerivativeReportSecurityLineGenericEventSold({
		soldOn: trade.date,
		quantity: quantity,
		pricePerUnit: trade.exchangedMoney.underlyingTradePrice * trade.multiplier,
		pricePerUnitInOriginalCurrency:
			trade.exchangedMoney.underlyingTradePrice *
			trade.multiplier *
			(1 / trade.exchangedMoney.fxRateToBase),
		totalPrice: quantity * trade.exchangedMoney.underlyingTradePrice * trade.multiplier,
		totalPriceInOriginalCurrency:
			quantity *
			trade.exchangedMoney.underlyingTradePrice *
			trade.multiplier *
			(1 / trade.exchangedMoney.fxRateToBase),
		commissions: commission,
		commissionsInOriginalCurrency: commission * (1 / trade.exchangedMoney.fxRateToBase),
		leveraged: false,
	});
}

export class IfiReportGenerator {
	constructor(private readonly processor: FinancialEventsProcessor) {}

	convert(
		config: TaxAuthorityConfiguration,
		groupings: FinancialGrouping[],
	): EDavkiGenericDerivativeReportItem[] {
		const converted: EDavkiGenericDerivativeReportItem[] = [];
		const periodStart = config.fromDate;
		const periodEnd = config.toDate;

		for (const financialGrouping of groupings) {
			const lotMatchingConfiguration: LotMatchingConfiguration = {
				fromDate: periodStart,
				toDate: periodEnd,
				forStocks: (_grouping) => {
					if (config.lotMatchingMethod === TaxAuthorityLotMatchingMethod.PROVIDED) {
						return new ProvidedLotMatchingMethod([]);
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

			const interestingGrouping = this.processor.process(
				financialGrouping,
				lotMatchingConfiguration,
			);

			// TODO: Figure out how to get lots (currently only trade events are used, not predefined lots)
			for (const derivativeGrouping of interestingGrouping.derivativeGroupings) {
				const legs = derivativeGrouping.derivativeLotLegs;

				if (legs.length === 0) {
					continue;
				}

				const convertedLines = legs.map(({ trade, quantity, commission }) => {
					if (trade instanceof TradeEventDerivativeAcquired)
						return convertBuy(trade, quantity, commission);
					return convertSell(trade, quantity, commission);
				});

				// Counts a trade's whole tax once for every lot it falls into, like the lot clones did.
				const foreignTaxPaidSum = legs.reduce(
					(sum, leg) => sum + (leg.trade.exchangedMoney.taxTotal ?? 0),
					0,
				);
				let foreignTaxPaid: number | null = foreignTaxPaidSum;
				let hasForeignTax = true;
				if (foreignTaxPaidSum <= 0) {
					foreignTaxPaid = null;
					hasForeignTax = false;
				}

				const isinEntry = new EDavkiGenericDerivativeReportItem({
					inventoryListType: EDavkiDerivativeSecurityType.OPTION_OR_CERTIFICATE,
					itemType: EDavkiDerivativeReportItemType.DERIVATIVE,
					code: derivativeGrouping.financialIdentifier.ticker,
					isin: derivativeGrouping.financialIdentifier.isin,
					name: derivativeGrouping.financialIdentifier.name,
					hasForeignTax,
					foreignTax: foreignTaxPaid,
					ftCountryId: null,
					ftCountryName: null,
					items: convertedLines,
				});

				converted.push(isinEntry);
			}
		}

		// For consistent listing between report types, sort by Name
		converted.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

		return converted;
	}

	toXml(config: TaxAuthorityConfiguration, items: EDavkiGenericDerivativeReportItem[]): string {
		return generateXmlReport(config, items);
	}

	toCsv(items: EDavkiGenericDerivativeReportItem[]): string {
		return generateCsvReport(items);
	}
}
