import { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import { TradeEventStockAcquired } from "@brrr/Core/Models/Events/Stock/TradeEventStockAcquired";
import type { TradeEventStockSold } from "@brrr/Core/Models/Events/Stock/TradeEventStockSold";
import type { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import type { FinancialEventsProcessor } from "@brrr/Core/Services/LotMatching/FinancialEventsProcessor";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/Models/TaxAuthorityConfiguration";
import type { TaxpayerInfo } from "@brrr/TaxAuthorities/Schemas/TaxpayerConfigSchema";
import { createLotMatchingMethod } from "@brrr/TaxAuthorities/Services/LotMatchingMethodFactory";
import type { EDavkiDocumentWorkflowType } from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiDocumentWorkflowType";
import {
	EDavkiIsin,
	EDavkiSecurityCode,
} from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import { EDavkiGenericTradeReportItem } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiGenericTradeReportItem";
import { EDavkiTradeReportGainType } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportGainType";
import { EDavkiTradeReportSecurityLineEvent } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineEvent";
import { EDavkiTradeReportSecurityLineGenericEventBought } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineGenericEventBought";
import { EDavkiTradeReportSecurityLineGenericEventSold } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineGenericEventSold";
import { EDavkiTradeSecurityType } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeSecurityType";
import { generateCsvReport } from "@brrr/TaxAuthorities/Slovenia/Services/Kdvp/CsvDohKdvp";
import { generateXmlReport } from "@brrr/TaxAuthorities/Slovenia/Services/Kdvp/XmlDohKdvp";
import { foreignTaxOf, toOriginalCurrency } from "@brrr/TaxAuthorities/Slovenia/Utils/Amounts";

const GAIN_MAPPINGS: Record<AcquisitionMethod, EDavkiTradeReportGainType> = {
	[AcquisitionMethod.BOUGHT]: EDavkiTradeReportGainType.BOUGHT,
	[AcquisitionMethod.GIFT]: EDavkiTradeReportGainType.GIFT,
	[AcquisitionMethod.INHERITANCE]: EDavkiTradeReportGainType.INHERITANCE,
	[AcquisitionMethod.OTHER]: EDavkiTradeReportGainType.OTHER,
};

function convertStockBuy(
	trade: TradeEventStockAcquired,
	quantity: number,
	commission: number,
): EDavkiTradeReportSecurityLineGenericEventBought {
	return new EDavkiTradeReportSecurityLineGenericEventBought({
		boughtOn: trade.date,
		gainType: GAIN_MAPPINGS[trade.acquisitionMethod] ?? EDavkiTradeReportGainType.OTHER,
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
	public constructor(private readonly processor: FinancialEventsProcessor) {}

	public convert(
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

	public toXml(
		config: TaxAuthorityConfiguration,
		userConfig: TaxpayerInfo,
		documentType: EDavkiDocumentWorkflowType,
		items: EDavkiGenericTradeReportItem[],
	): string {
		return generateXmlReport(config, userConfig, documentType, items);
	}

	public toCsv(items: EDavkiGenericTradeReportItem[]): string {
		return generateCsvReport(items);
	}
}
