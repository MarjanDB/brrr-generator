import {
	type FinancialGrouping,
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventDerivativeAcquired,
	TradeEventStockAcquired,
} from "@brrr/lib";
import type { DateTime } from "luxon";

export type CumulativePoint = {
	date: DateTime;
	value: number;
};

export type InstrumentStats = {
	totalBought: number;
	totalSold: number;
	totalDividends: number;
	baseCurrency: string;
	overallCumulativeSeries: CumulativePoint[];
	stockCumulativeSeries: CumulativePoint[];
	dividendCumulativeSeries: CumulativePoint[];
	derivativeCumulativeSeries: CumulativePoint[];
};

type RawPoint = { date: DateTime; delta: number };

function toCumulative(
	points: RawPoint[],
	globalStart: DateTime | null,
	globalEnd: DateTime | null,
): CumulativePoint[] {
	const sorted = [...points].sort((a, b) => a.date.toMillis() - b.date.toMillis());
	let running = 0;
	const result: CumulativePoint[] = sorted.map((p) => {
		running += p.delta;
		return { date: p.date, value: running };
	});

	const first = result[0];
	const last = result[result.length - 1];

	if (globalStart && (first === undefined || first.date.toMillis() > globalStart.toMillis())) {
		result.unshift({ date: globalStart, value: 0 });
	}
	if (globalEnd && last !== undefined && last.date.toMillis() < globalEnd.toMillis()) {
		result.push({ date: globalEnd, value: last.value });
	}

	return result;
}

function tradeValueInBase(money: {
	underlyingQuantity: number;
	underlyingTradePrice: number;
	fxRateToBase: number;
}): number {
	return money.underlyingQuantity * money.underlyingTradePrice * money.fxRateToBase;
}

function firstCurrency(groupings: FinancialGrouping[]): string {
	for (const g of groupings) {
		for (const t of g.stockTrades) return t.exchangedMoney.underlyingCurrency;
		for (const t of g.cashTransactions) return t.exchangedMoney.underlyingCurrency;
		for (const dg of g.derivativeGroupings) {
			for (const t of dg.derivativeTrades) return t.exchangedMoney.underlyingCurrency;
		}
	}
	return "";
}

export function useInstrumentStats(groupings: FinancialGrouping[]): InstrumentStats {
	const baseCurrency = firstCurrency(groupings);

	let totalBought = 0;
	let totalSold = 0;
	let totalDividends = 0;

	const stockPoints: RawPoint[] = [];
	const dividendPoints: RawPoint[] = [];
	const derivativePoints: RawPoint[] = [];

	for (const g of groupings) {
		for (const trade of g.stockTrades) {
			const value = tradeValueInBase(trade.exchangedMoney);
			if (trade instanceof TradeEventStockAcquired) {
				totalBought += value;
			} else {
				totalSold += value;
			}
			stockPoints.push({ date: trade.date, delta: value });
		}

		for (const tx of g.cashTransactions) {
			if (
				tx instanceof TradeEventCashTransactionDividend ||
				tx instanceof TradeEventCashTransactionPaymentInLieuOfDividend
			) {
				const value = tradeValueInBase(tx.exchangedMoney);
				totalDividends += value;
				dividendPoints.push({ date: tx.date, delta: value });
			}
		}

		for (const dg of g.derivativeGroupings) {
			for (const trade of dg.derivativeTrades) {
				const value = tradeValueInBase(trade.exchangedMoney);
				if (trade instanceof TradeEventDerivativeAcquired) {
					totalBought += value;
				} else {
					totalSold += value;
				}
				derivativePoints.push({ date: trade.date, delta: value });
			}
		}
	}

	const allPoints = [...stockPoints, ...dividendPoints, ...derivativePoints];
	const allDates = allPoints.map((p) => p.date.toMillis());
	const globalStart =
		allDates.length > 0
			? (allPoints.find((p) => p.date.toMillis() === Math.min(...allDates))?.date ?? null)
			: null;
	const globalEnd =
		allDates.length > 0
			? (allPoints.find((p) => p.date.toMillis() === Math.max(...allDates))?.date ?? null)
			: null;

	return {
		totalBought,
		totalSold,
		totalDividends,
		baseCurrency,
		overallCumulativeSeries: toCumulative(allPoints, globalStart, globalEnd),
		stockCumulativeSeries: toCumulative(stockPoints, globalStart, globalEnd),
		dividendCumulativeSeries: toCumulative(dividendPoints, globalStart, globalEnd),
		derivativeCumulativeSeries: toCumulative(derivativePoints, globalStart, globalEnd),
	};
}
