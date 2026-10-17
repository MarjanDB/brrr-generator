import { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats";
import {
	type TradeEvent,
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
	type TradeEventDerivative,
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	type TradeEventStock,
	TradeEventStockAcquired,
	TradeEventStockSold,
	type TransactionCash,
} from "@brrr/Core/Schemas/Events";
import { TaxLot, type TaxLotDerivative, type TaxLotStock } from "@brrr/Core/Schemas/Lots";
import {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	StagingTradeEventCashTransactionWithholdingTax,
	type StagingTradeEventDerivative,
	StagingTradeEventDerivativeAcquired,
	type StagingTradeEventStock,
	StagingTradeEventStockAcquired,
	type StagingTransactionCash,
} from "@brrr/Core/Schemas/Staging/Events";
import type { StagingTaxLot } from "@brrr/Core/Schemas/Staging/Lots";

// Staging events and lots carry the broker's view of an instrument; these turn them into the
// core model the tax authorities work with.

function toCoreTradeFields(
	input: StagingTradeEventStock | StagingTradeEventDerivative | StagingTransactionCash,
) {
	return {
		id: input.id,
		assetClass: input.assetClass,
		date: input.date,
		multiplier: input.multiplier,
		exchangedMoney: input.exchangedMoney,
		provenance: [],
	};
}

export function toCoreStockTrade(input: StagingTradeEventStock): TradeEventStock {
	const fields = toCoreTradeFields(input);
	if (input instanceof StagingTradeEventStockAcquired) {
		return new TradeEventStockAcquired({ ...fields, acquiredReason: input.acquiredReason });
	}
	return new TradeEventStockSold(fields);
}

export function toCoreDerivativeTrade(input: StagingTradeEventDerivative): TradeEventDerivative {
	const fields = toCoreTradeFields(input);
	if (input instanceof StagingTradeEventDerivativeAcquired) {
		return new TradeEventDerivativeAcquired({ ...fields, acquiredReason: input.acquiredReason });
	}
	return new TradeEventDerivativeSold(fields);
}

export function toCoreCashTransaction(input: StagingTransactionCash): TransactionCash {
	const fields = {
		...toCoreTradeFields(input),
		actionId: input.actionId,
		transactionId: input.transactionId,
		listingExchange: input.listingExchange,
	};
	if (input instanceof StagingTradeEventCashTransactionDividend) {
		return new TradeEventCashTransactionDividend({ ...fields, dividendType: input.dividendType });
	}
	if (input instanceof StagingTradeEventCashTransactionWithholdingTax) {
		return new TradeEventCashTransactionWithholdingTax(fields);
	}
	if (input instanceof StagingTradeEventCashTransactionPaymentInLieuOfDividends) {
		return new TradeEventCashTransactionPaymentInLieuOfDividend({
			...fields,
			dividendType: input.dividendType,
		});
	}
	return new TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend(fields);
}

// A broker lot names its buy by transaction ID and its sell only by date.
function matchLotTrades<A extends TradeEvent, S extends TradeEvent>(
	input: StagingTaxLot,
	buys: A[],
	sells: S[],
): { acquired: A; sold: S } | null {
	const acquiredId = input.acquired.id;
	const soldAt = input.sold.dateTime;
	if (acquiredId === null || soldAt === null) {
		return null;
	}

	const acquired = buys.find((trade) => trade.id === acquiredId);
	const sold = sells.find((trade) => trade.date.toMillis() === soldAt.toMillis());
	return acquired && sold ? { acquired, sold } : null;
}

function toCoreLot<A extends TradeEvent, S extends TradeEvent>(
	input: StagingTaxLot,
	trades: { acquired: A; sold: S },
): TaxLot<A, S> {
	return new TaxLot({
		id: input.id,
		quantity: input.quantity,
		acquired: trades.acquired,
		sold: trades.sold,
		shortLongType: GenericShortLong.LONG,
		provenance: [],
	});
}

export function toCoreStockLot(input: StagingTaxLot, trades: TradeEventStock[]): TaxLotStock {
	const matched = matchLotTrades(
		input,
		trades.filter((t): t is TradeEventStockAcquired => t instanceof TradeEventStockAcquired),
		trades.filter((t): t is TradeEventStockSold => !(t instanceof TradeEventStockAcquired)),
	);
	if (matched === null) {
		throw new Error(`LookupError: Failed to match stock lot (ID: ${input.id})`);
	}
	return toCoreLot(input, matched);
}

export function toCoreDerivativeLot(
	input: StagingTaxLot,
	trades: TradeEventDerivative[],
): TaxLotDerivative {
	const matched = matchLotTrades(
		input,
		trades.filter(
			(t): t is TradeEventDerivativeAcquired => t instanceof TradeEventDerivativeAcquired,
		),
		trades.filter(
			(t): t is TradeEventDerivativeSold => !(t instanceof TradeEventDerivativeAcquired),
		),
	);
	if (matched === null) {
		throw new Error(`LookupError: Failed to match derivative lot (ID: ${input.id})`);
	}
	return toCoreLot(input, matched);
}
