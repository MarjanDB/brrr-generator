import { type CashFields, type TradeFields, Values } from "@brrr/__tests__/support/Values";
import {
	GenericAssetClass,
	type GenericCategory,
	GenericDerivativeReportItemGainType,
	type GenericDividendType,
	type GenericShortLong,
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
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";

type WithIdentifier = { identifier: StagingFinancialIdentifier };

// One side of a staging lot: the trade it names by id, and the date it happened (either may be null).
type LotSide = { id: StagingTaxLotMatchingDetails["id"]; date: string | null };

// The Staging* twins of the core builders, as a broker's transform produces them. Like those, each
// builder fixes only what its name says; every other value is required.
export const StagingBuilders = {
	stockBought(fields: TradeFields & WithIdentifier): StagingTradeEventStockAcquired {
		return new StagingTradeEventStockAcquired({
			id: fields.id,
			financialIdentifier: fields.identifier,
			assetClass: GenericAssetClass.STOCK,
			date: Values.date(fields.date),
			multiplier: 1,
			exchangedMoney: Values.tradeMoney(fields),
			acquiredReason: GenericTradeReportItemGainType.BOUGHT,
		});
	},

	stockSold(fields: TradeFields & WithIdentifier): StagingTradeEventStockSold {
		return new StagingTradeEventStockSold({
			id: fields.id,
			financialIdentifier: fields.identifier,
			assetClass: GenericAssetClass.STOCK,
			date: Values.date(fields.date),
			multiplier: 1,
			exchangedMoney: Values.tradeMoney(fields),
		});
	},

	optionBought(
		fields: TradeFields & WithIdentifier & { multiplier: number },
	): StagingTradeEventDerivativeAcquired {
		return new StagingTradeEventDerivativeAcquired({
			id: fields.id,
			financialIdentifier: fields.identifier,
			assetClass: GenericAssetClass.OPTION,
			date: Values.date(fields.date),
			multiplier: fields.multiplier,
			exchangedMoney: Values.tradeMoney(fields),
			acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
		});
	},

	optionSold(
		fields: TradeFields & WithIdentifier & { multiplier: number },
	): StagingTradeEventDerivativeSold {
		return new StagingTradeEventDerivativeSold({
			id: fields.id,
			financialIdentifier: fields.identifier,
			assetClass: GenericAssetClass.OPTION,
			date: Values.date(fields.date),
			multiplier: fields.multiplier,
			exchangedMoney: Values.tradeMoney(fields),
		});
	},

	dividend(
		fields: CashFields & WithIdentifier & { dividendType: GenericDividendType },
	): StagingTradeEventCashTransactionDividend {
		return new StagingTradeEventCashTransactionDividend({
			...cashEvent(fields),
			dividendType: fields.dividendType,
		});
	},

	withholdingTax(
		fields: CashFields & WithIdentifier,
	): StagingTradeEventCashTransactionWithholdingTax {
		return new StagingTradeEventCashTransactionWithholdingTax(cashEvent(fields));
	},

	paymentInLieu(
		fields: CashFields & WithIdentifier & { dividendType: GenericDividendType },
	): StagingTradeEventCashTransactionPaymentInLieuOfDividends {
		return new StagingTradeEventCashTransactionPaymentInLieuOfDividends({
			...cashEvent(fields),
			dividendType: fields.dividendType,
		});
	},

	paymentInLieuWithholdingTax(
		fields: CashFields & WithIdentifier,
	): StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends {
		return new StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends(
			cashEvent(fields),
		);
	},

	taxLot(
		fields: {
			id: StagingTaxLot["id"];
			quantity: number;
			shortLongType: GenericShortLong;
			acquired: LotSide;
			sold: LotSide;
		} & WithIdentifier,
	): StagingTaxLot {
		return new StagingTaxLot({
			id: fields.id,
			financialIdentifier: fields.identifier,
			quantity: fields.quantity,
			acquired: lotSide(fields.acquired),
			sold: lotSide(fields.sold),
			shortLongType: fields.shortLongType,
		});
	},

	grouping(
		fields: {
			countryOfOrigin: StagingFinancialGrouping["countryOfOrigin"];
			category: GenericCategory;
			stockTrades: StagingTradeEventStock[];
			stockTaxLots: StagingTaxLot[];
			derivativeTrades: StagingTradeEventDerivative[];
			derivativeTaxLots: StagingTaxLot[];
			cashTransactions: StagingTransactionCash[];
		} & WithIdentifier,
	): StagingFinancialGrouping {
		return new StagingFinancialGrouping({
			financialIdentifier: fields.identifier,
			countryOfOrigin: fields.countryOfOrigin,
			underlyingCategory: fields.category,
			stockTrades: fields.stockTrades,
			stockTaxLots: fields.stockTaxLots,
			derivativeTrades: fields.derivativeTrades,
			derivativeTaxLots: fields.derivativeTaxLots,
			cashTransactions: fields.cashTransactions,
		});
	},
};

// The fields every staging cash transaction carries.
function cashEvent(fields: CashFields & WithIdentifier) {
	return {
		id: fields.id,
		financialIdentifier: fields.identifier,
		assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
		date: Values.date(fields.date),
		multiplier: 1,
		exchangedMoney: Values.cashMoney(fields),
		actionId: fields.actionId,
		transactionId: fields.transactionId,
		listingExchange: fields.listingExchange,
	};
}

function lotSide(side: LotSide): StagingTaxLotMatchingDetails {
	return new StagingTaxLotMatchingDetails({
		id: side.id,
		dateTime: side.date === null ? null : Values.date(side.date),
	});
}
