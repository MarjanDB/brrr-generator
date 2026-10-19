import type { FinancialEvents } from "@brrr/lib";
import type { DateTime } from "luxon";

// Every year a trade or a payment in the import falls in, oldest first: the years it can make
// reports for.
export function reportYearsOf(events: FinancialEvents): number[] {
	const years = new Set<number>();
	for (const grouping of events.groupings) {
		for (const trade of grouping.stockTrades) {
			years.add(trade.date.year);
		}
		for (const transaction of grouping.cashTransactions) {
			years.add(transaction.date.year);
		}
		for (const derivative of grouping.derivativeGroupings) {
			for (const trade of derivative.derivativeTrades) {
				years.add(trade.date.year);
			}
		}
	}
	return [...years].sort((a, b) => a - b);
}

// The year the reports open on: last year, the one people file for, when the import has anything
// in it; else the latest earlier year that has something, else the earliest later one. With
// nothing in the import, last year.
export function defaultTaxYear(years: number[], today: DateTime): number {
	const lastYear = today.year - 1;
	const upToLastYear = years.filter((year) => year <= lastYear);
	return upToLastYear.at(-1) ?? years[0] ?? lastYear;
}
