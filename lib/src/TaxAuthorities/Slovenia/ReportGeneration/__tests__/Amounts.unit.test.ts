import { Scenario } from "@brrr/__tests__/support/Scenario";
import type { TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import {
	foreignTaxOf,
	round,
	toOriginalCurrency,
} from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Amounts";

function tradeWithTax(taxTotal: number): TradeEventStockSold {
	return Scenario.build.stockSold({
		id: `T${taxTotal}`,
		date: "2024-01-02",
		price: 10,
		money: {
			underlyingCurrency: "USD",
			commissionCurrency: "USD",
			taxCurrency: "USD",
			taxTotal,
			fxRateToBase: 0.9,
		},
	});
}

test("round applies Math.round to the scaled value, so halves go up", () => {
	expect(round(2.5, 0)).toEqual(3);
	expect(round(-2.5, 0)).toEqual(-2);
	expect(round(1.25, 1)).toEqual(1.3);
	expect(round(2.675, 2)).toEqual(2.68);
	// 1.234565 * 100000 lands just below the half in binary, so it rounds down.
	expect(round(1.234565, 5)).toEqual(1.23456);
});

test("toOriginalCurrency divides by the rate to base", () => {
	expect(toOriginalCurrency(10, 0.5)).toEqual(20);
});

test("toOriginalCurrency multiplies by the inverse rate, matching the reports' arithmetic", () => {
	const amount = 123.45;
	const fxRateToBase = 0.90969;

	expect(toOriginalCurrency(amount, fxRateToBase)).toEqual(amount * (1 / fxRateToBase));
});

test("foreignTaxOf reports no foreign tax for no trades", () => {
	expect(foreignTaxOf([])).toEqual({ hasForeignTax: false, foreignTax: null });
});

test("foreignTaxOf sums the trades' taxes", () => {
	expect(foreignTaxOf([tradeWithTax(1.5), tradeWithTax(2)])).toEqual({
		hasForeignTax: true,
		foreignTax: 3.5,
	});
});

test("foreignTaxOf treats a non-positive total as no foreign tax", () => {
	expect(foreignTaxOf([tradeWithTax(-1)])).toEqual({ hasForeignTax: false, foreignTax: null });
});
