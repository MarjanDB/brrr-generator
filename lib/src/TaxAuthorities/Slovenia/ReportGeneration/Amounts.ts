import type { TradeEvent } from "@brrr/Core/Schemas/Events";

export function round(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

// Amounts are kept in the base currency; fxRateToBase converts original → base.
export function toOriginalCurrency(amountInBase: number, fxRateToBase: number): number {
	return amountInBase * (1 / fxRateToBase);
}

export function foreignTaxOf(trades: TradeEvent[]): {
	hasForeignTax: boolean;
	foreignTax: number | null;
} {
	const total = trades.reduce((sum, trade) => sum + trade.exchangedMoney.taxTotal, 0);
	if (total <= 0) {
		return { hasForeignTax: false, foreignTax: null };
	}
	return { hasForeignTax: true, foreignTax: total };
}
