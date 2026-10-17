import { type CashOptions, type TradeOptions, Values } from "@brrr/__tests__/support/Values";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	StagingTradeEventCashTransactionWithholdingTax,
	StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends,
	type StagingTradeEventDerivative,
	StagingTradeEventDerivativeAcquired,
	StagingTradeEventDerivativeSold,
	type StagingTradeEventStock,
	StagingTradeEventStockAcquired,
	StagingTradeEventStockSold,
	type StagingTransactionCash,
} from "@brrr/Core/Schemas/Staging/Events";
import { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping";
import { StagingTaxLot, StagingTaxLotMatchingDetails } from "@brrr/Core/Schemas/Staging/Lots";
import { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";

type WithIdentifier = { identifier?: StagingFinancialIdentifier };

const defaultIdentifier = () => new StagingFinancialIdentifier({ isin: "ISIN" });

function tradeFields(options: TradeOptions & WithIdentifier, prefix: string, quantity: number) {
	return {
		id: options.id ?? Values.nextId(prefix),
		financialIdentifier: options.identifier ?? defaultIdentifier(),
		date: Values.date(options.date ?? Values.defaultDate),
		multiplier: options.multiplier ?? 1,
		exchangedMoney: Values.tradeMoney(options, quantity),
	};
}

function cashFields(options: CashOptions & WithIdentifier, prefix: string, amount: number) {
	return {
		...Values.cashFields(options, prefix),
		financialIdentifier: options.identifier ?? defaultIdentifier(),
		assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
		exchangedMoney: Values.cashMoney(options, amount),
	};
}

// One side of a staging lot: the trade it names by id, or the date it happened.
type LotSide = { id?: StagingTaxLotMatchingDetails["id"]; date?: string | null };

function lotSide(side: LotSide): StagingTaxLotMatchingDetails {
	return new StagingTaxLotMatchingDetails({
		id: side.id ?? null,
		dateTime: side.date ? Values.date(side.date) : null,
	});
}

// The Staging* twins of the core builders, as a broker's transform produces them.
export const StagingBuilders = {
	stockBought(options: TradeOptions & WithIdentifier = {}): StagingTradeEventStockAcquired {
		return new StagingTradeEventStockAcquired({
			...tradeFields(options, "stockBought", 1),
			assetClass: GenericAssetClass.STOCK,
			acquiredReason: GenericTradeReportItemGainType.BOUGHT,
		});
	},

	stockSold(options: TradeOptions & WithIdentifier = {}): StagingTradeEventStockSold {
		return new StagingTradeEventStockSold({
			...tradeFields(options, "stockSold", -1),
			assetClass: GenericAssetClass.STOCK,
		});
	},

	derivativeBought(
		options: TradeOptions & WithIdentifier = {},
	): StagingTradeEventDerivativeAcquired {
		return new StagingTradeEventDerivativeAcquired({
			...tradeFields(options, "derivativeBought", 1),
			assetClass: GenericAssetClass.OPTION,
			acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
		});
	},

	derivativeSold(options: TradeOptions & WithIdentifier = {}): StagingTradeEventDerivativeSold {
		return new StagingTradeEventDerivativeSold({
			...tradeFields(options, "derivativeSold", -1),
			assetClass: GenericAssetClass.OPTION,
		});
	},

	dividend(options: CashOptions & WithIdentifier = {}): StagingTradeEventCashTransactionDividend {
		return new StagingTradeEventCashTransactionDividend({
			...cashFields(options, "dividend", 1),
			dividendType: GenericDividendType.ORDINARY,
		});
	},

	withholdingTax(
		options: CashOptions & WithIdentifier = {},
	): StagingTradeEventCashTransactionWithholdingTax {
		return new StagingTradeEventCashTransactionWithholdingTax(
			cashFields(options, "withholdingTax", -1),
		);
	},

	paymentInLieu(
		options: CashOptions & WithIdentifier = {},
	): StagingTradeEventCashTransactionPaymentInLieuOfDividends {
		return new StagingTradeEventCashTransactionPaymentInLieuOfDividends({
			...cashFields(options, "paymentInLieu", 1),
			dividendType: GenericDividendType.ORDINARY,
		});
	},

	paymentInLieuWithholdingTax(
		options: CashOptions & WithIdentifier = {},
	): StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends {
		return new StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends(
			cashFields(options, "paymentInLieuWithholdingTax", -1),
		);
	},

	taxLot(
		options: {
			id?: StagingTaxLot["id"];
			quantity?: number;
			acquired: LotSide;
			sold: LotSide;
		} & WithIdentifier,
	): StagingTaxLot {
		return new StagingTaxLot({
			id: options.id ?? Values.nextId("lot"),
			financialIdentifier: options.identifier ?? defaultIdentifier(),
			quantity: options.quantity ?? 1,
			acquired: lotSide(options.acquired),
			sold: lotSide(options.sold),
			shortLongType: GenericShortLong.LONG,
		});
	},

	grouping(
		options: {
			countryOfOrigin?: string | null;
			stockTrades?: StagingTradeEventStock[];
			stockTaxLots?: StagingTaxLot[];
			derivativeTrades?: StagingTradeEventDerivative[];
			derivativeTaxLots?: StagingTaxLot[];
			cashTransactions?: StagingTransactionCash[];
		} & WithIdentifier = {},
	): StagingFinancialGrouping {
		return new StagingFinancialGrouping({
			financialIdentifier: options.identifier ?? defaultIdentifier(),
			countryOfOrigin: options.countryOfOrigin ?? null,
			underlyingCategory: GenericCategory.REGULAR,
			stockTrades: options.stockTrades ?? [],
			stockTaxLots: options.stockTaxLots ?? [],
			derivativeTrades: options.derivativeTrades ?? [],
			derivativeTaxLots: options.derivativeTaxLots ?? [],
			cashTransactions: options.cashTransactions ?? [],
		});
	},
};
