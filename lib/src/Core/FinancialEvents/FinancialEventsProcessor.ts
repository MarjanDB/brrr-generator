import type { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { TradeEventDerivative, TradeEventStock } from "@brrr/Core/Schemas/Events";
import type { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

// Matches an instrument's trades into lots and keeps the trades of the lots closed in a period:
// those are the trades a capital gains report lists.
export class FinancialEventsProcessor {
	constructor(private readonly lotMatcher: LotMatcher) {}

	stockTradesClosedInPeriod(
		grouping: FinancialGrouping,
		method: LotMatchingMethod,
		fromDate: ValidDateTime,
		toDate: ValidDateTime,
	): TradeEventStock[] {
		return this.lotMatcher
			.matchLotsWithGenericTradeEvents(method, grouping.stockTrades)
			.getTradesOfLotsClosedInPeriod(fromDate, toDate).trades;
	}

	derivativeTradesClosedInPeriod(
		grouping: DerivativeGrouping,
		method: LotMatchingMethod,
		fromDate: ValidDateTime,
		toDate: ValidDateTime,
	): TradeEventDerivative[] {
		return this.lotMatcher
			.matchLotsWithGenericTradeEvents(method, grouping.derivativeTrades)
			.getTradesOfLotsClosedInPeriod(fromDate, toDate).trades;
	}
}
