import { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import { TradeEventDerivativeAcquired } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivativeAcquired";
import type { TradeEventDerivativeSold } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivativeSold";
import type { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import type { FinancialEventsProcessor } from "@brrr/Core/Services/LotMatching/FinancialEventsProcessor";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { createLotMatchingMethod } from "@brrr/TaxAuthorities/LotMatchingMethodFactory";
import {
	foreignTaxOf,
	toOriginalCurrency,
} from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Amounts";
import { generateCsvReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/CsvDIfi";
import { generateXmlReport } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/XmlDIfi";
import {
	EDavkiIsin,
	EDavkiSecurityCode,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/EDavkiIdentifiers";
import {
	EDavkiDerivativeReportGainType,
	EDavkiDerivativeReportItemType,
	EDavkiDerivativeReportSecurityLineGenericEventBought,
	EDavkiDerivativeReportSecurityLineGenericEventSold,
	EDavkiDerivativeSecurityType,
	EDavkiGenericDerivativeReportItem,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";

const GAIN_MAPPINGS: Record<AcquisitionMethod, EDavkiDerivativeReportGainType> = {
	[AcquisitionMethod.BOUGHT]: EDavkiDerivativeReportGainType.BOUGHT,
	[AcquisitionMethod.GIFT]: EDavkiDerivativeReportGainType.GIFT,
	[AcquisitionMethod.INHERITANCE]: EDavkiDerivativeReportGainType.INHERITANCE,
	[AcquisitionMethod.OTHER]: EDavkiDerivativeReportGainType.OTHER,
};

function convertBuy(
	trade: TradeEventDerivativeAcquired,
	quantity: number,
	commission: number,
): EDavkiDerivativeReportSecurityLineGenericEventBought {
	return new EDavkiDerivativeReportSecurityLineGenericEventBought({
		boughtOn: trade.date,
		gainType: GAIN_MAPPINGS[trade.acquisitionMethod] ?? EDavkiDerivativeReportGainType.OTHER,
		quantity: quantity,
		pricePerUnit: trade.exchangedMoney.priceInBase * trade.multiplier,
		pricePerUnitInOriginalCurrency: toOriginalCurrency(
			trade.exchangedMoney.priceInBase * trade.multiplier,
			trade.exchangedMoney.fxRateToBase,
		),
		totalPrice: quantity * trade.exchangedMoney.priceInBase * trade.multiplier,
		totalPriceInOriginalCurrency: toOriginalCurrency(
			quantity * trade.exchangedMoney.priceInBase * trade.multiplier,
			trade.exchangedMoney.fxRateToBase,
		),
		commissions: commission,
		commissionsInOriginalCurrency: toOriginalCurrency(
			commission,
			trade.exchangedMoney.fxRateToBase,
		),
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
		pricePerUnit: trade.exchangedMoney.priceInBase * trade.multiplier,
		pricePerUnitInOriginalCurrency: toOriginalCurrency(
			trade.exchangedMoney.priceInBase * trade.multiplier,
			trade.exchangedMoney.fxRateToBase,
		),
		totalPrice: quantity * trade.exchangedMoney.priceInBase * trade.multiplier,
		totalPriceInOriginalCurrency: toOriginalCurrency(
			quantity * trade.exchangedMoney.priceInBase * trade.multiplier,
			trade.exchangedMoney.fxRateToBase,
		),
		commissions: commission,
		commissionsInOriginalCurrency: toOriginalCurrency(
			commission,
			trade.exchangedMoney.fxRateToBase,
		),
		leveraged: false,
	});
}

export class IfiReportGenerator {
	public constructor(private readonly processor: FinancialEventsProcessor) {}

	public convert(
		config: TaxAuthorityConfiguration,
		groupings: FinancialGrouping[],
	): EDavkiGenericDerivativeReportItem[] {
		const converted: EDavkiGenericDerivativeReportItem[] = [];
		const periodStart = config.fromDate;
		const periodEnd = config.toDate;

		for (const financialGrouping of groupings) {
			// TODO: Figure out how to get lots (currently only trade events are used, not predefined lots)
			for (const derivativeGrouping of financialGrouping.derivativeGroupings) {
				const legs = this.processor.derivativeLotLegsClosedInPeriod(
					derivativeGrouping,
					createLotMatchingMethod(config.lotMatchingMethod, []),
					periodStart,
					periodEnd,
				);

				if (legs.length === 0) {
					continue;
				}

				const convertedLines = legs.map(({ trade, quantity, commission }) => {
					if (trade instanceof TradeEventDerivativeAcquired)
						return convertBuy(trade, quantity, commission);
					return convertSell(trade, quantity, commission);
				});

				// Counts a trade's whole tax once for every lot it falls into; kept so the reports don't change.
				const { hasForeignTax, foreignTax: foreignTaxPaid } = foreignTaxOf(
					legs.map((leg) => leg.trade),
				);

				const { ticker, isin } = derivativeGrouping.financialIdentifier;
				const isinEntry = new EDavkiGenericDerivativeReportItem({
					inventoryListType: EDavkiDerivativeSecurityType.OPTION_OR_CERTIFICATE,
					itemType: EDavkiDerivativeReportItemType.DERIVATIVE,
					code: ticker === null ? null : EDavkiSecurityCode.FromTicker(ticker),
					isin: isin === null ? null : EDavkiIsin.FromIsin(isin),
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

	public toXml(
		config: TaxAuthorityConfiguration,
		items: EDavkiGenericDerivativeReportItem[],
	): string {
		return generateXmlReport(config, items);
	}

	public toCsv(items: EDavkiGenericDerivativeReportItem[]): string {
		return generateCsvReport(items);
	}
}
