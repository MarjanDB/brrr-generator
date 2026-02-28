import type { FinancialEventsProcessor } from "@brrr/core/financialEvents/FinancialEventsProcessor.ts";
import type { FinancialGrouping } from "@brrr/core/schemas/Grouping.ts";
import type { LotMatchingConfiguration } from "@brrr/core/schemas/LotMatchingConfiguration.ts";
import { GenericDerivativeReportItemGainType } from "@brrr/core/schemas/CommonFormats.ts";
import type { TradeEventDerivativeAcquired, TradeEventDerivativeSold } from "@brrr/core/schemas/Events.ts";
import { FifoLotMatchingMethod } from "@brrr/core/lotMatching/FifoLotMatchingMethod.ts";
import { ProvidedLotMatchingMethod } from "@brrr/core/lotMatching/ProvidedLotMatchingMethod.ts";
import type { TaxAuthorityConfiguration } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import { TaxAuthorityLotMatchingMethod } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import {
	EDavkiDerivativeReportGainType,
	EDavkiDerivativeReportItemType,
	type EDavkiDerivativeReportSecurityLineGenericEventBought,
	type EDavkiDerivativeReportSecurityLineGenericEventSold,
	EDavkiDerivativeSecurityType,
	type EDavkiGenericDerivativeReportItem,
} from "@brrr/taxAuthorities/slovenia/schemas/Schemas.ts";
import { generateXmlReport } from "./XmlDIfi.ts";
import { generateCsvReport } from "./CsvDIfi.ts";

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

function convertBuy(line: TradeEventDerivativeAcquired): EDavkiDerivativeReportSecurityLineGenericEventBought {
	return {
		kind: "DerivativeBought",
		boughtOn: line.date,
		gainType: GAIN_MAPPINGS[line.acquiredReason] ?? EDavkiDerivativeReportGainType.OTHER,
		quantity: line.exchangedMoney.underlyingQuantity,
		pricePerUnit: line.exchangedMoney.underlyingTradePrice * line.multiplier,
		pricePerUnitInOriginalCurrency: line.exchangedMoney.underlyingTradePrice * line.multiplier * (1 / line.exchangedMoney.fxRateToBase),
		totalPrice: line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice * line.multiplier,
		totalPriceInOriginalCurrency: line.exchangedMoney.underlyingQuantity *
			line.exchangedMoney.underlyingTradePrice *
			line.multiplier *
			(1 / line.exchangedMoney.fxRateToBase),
		commissions: line.exchangedMoney.comissionTotal,
		commissionsInOriginalCurrency: line.exchangedMoney.comissionTotal * (1 / line.exchangedMoney.fxRateToBase),
		leveraged: false,
	};
}

function convertSell(line: TradeEventDerivativeSold): EDavkiDerivativeReportSecurityLineGenericEventSold {
	return {
		kind: "DerivativeSold",
		soldOn: line.date,
		quantity: line.exchangedMoney.underlyingQuantity,
		pricePerUnit: line.exchangedMoney.underlyingTradePrice * line.multiplier,
		pricePerUnitInOriginalCurrency: line.exchangedMoney.underlyingTradePrice * line.multiplier * (1 / line.exchangedMoney.fxRateToBase),
		totalPrice: line.exchangedMoney.underlyingQuantity * line.exchangedMoney.underlyingTradePrice * line.multiplier,
		totalPriceInOriginalCurrency: line.exchangedMoney.underlyingQuantity *
			line.exchangedMoney.underlyingTradePrice *
			line.multiplier *
			(1 / line.exchangedMoney.fxRateToBase),
		commissions: line.exchangedMoney.comissionTotal,
		commissionsInOriginalCurrency: line.exchangedMoney.comissionTotal * (1 / line.exchangedMoney.fxRateToBase),
		leveraged: false,
	};
}

export class IfiReportGenerator {
	constructor(private readonly processor: FinancialEventsProcessor) {}

	convert(config: TaxAuthorityConfiguration, groupings: FinancialGrouping[]): EDavkiGenericDerivativeReportItem[] {
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

			const interestingGrouping = this.processor.process(financialGrouping, lotMatchingConfiguration);

			for (const derivativeGrouping of interestingGrouping.derivativeGroupings) {
				const allLines = [...derivativeGrouping.derivativeTrades];
				allLines.sort((a, b) => a.date.toMillis() - b.date.toMillis());

				if (allLines.length === 0) {
					continue;
				}

				const convertedLines = allLines.map((line) => {
					if (line.kind === "DerivativeAcquired") return convertBuy(line);
					return convertSell(line as TradeEventDerivativeSold);
				});

				const foreignTaxPaidSum = allLines.reduce((sum, e) => sum + (e.exchangedMoney.taxTotal ?? 0), 0);
				let foreignTaxPaid: number | null = foreignTaxPaidSum;
				let hasForeignTax = true;
				if (foreignTaxPaidSum <= 0) {
					foreignTaxPaid = null;
					hasForeignTax = false;
				}

				const isinEntry: EDavkiGenericDerivativeReportItem = {
					inventoryListType: EDavkiDerivativeSecurityType.OPTION_OR_CERTIFICATE,
					itemType: EDavkiDerivativeReportItemType.DERIVATIVE,
					code: derivativeGrouping.financialIdentifier.getTicker(),
					isin: derivativeGrouping.financialIdentifier.getIsin(),
					name: derivativeGrouping.financialIdentifier.getName(),
					hasForeignTax,
					foreignTax: foreignTaxPaid,
					ftCountryId: null,
					ftCountryName: null,
					items: convertedLines,
				};

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

	toCsv(items: EDavkiGenericDerivativeReportItem[]): Record<string, unknown>[] {
		return generateCsvReport(items);
	}
}
