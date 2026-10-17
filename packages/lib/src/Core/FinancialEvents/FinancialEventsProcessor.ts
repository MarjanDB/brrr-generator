import type { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { LotLeg, MatchedLot } from "@brrr/Core/LotMatching/MatchedLot";
import type { TradeEventDerivative, TradeEventStock } from "@brrr/Core/Schemas/Events";
import type { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

// Matches an instrument's trades into lots and keeps the legs of the lots closed in a period:
// those are the trades a capital gains report lists, each with the lot's share of it.
export class FinancialEventsProcessor {
	constructor(private readonly lotMatcher: LotMatcher) {}

	stockLotLegsClosedInPeriod(
		grouping: FinancialGrouping,
		method: LotMatchingMethod,
		fromDate: ValidDateTime,
		toDate: ValidDateTime,
	): LotLeg<TradeEventStock>[] {
		return legsOfLotsClosedInPeriod(
			this.lotMatcher.matchLots(method, grouping.stockTrades),
			fromDate,
			toDate,
		);
	}

	derivativeLotLegsClosedInPeriod(
		grouping: DerivativeGrouping,
		method: LotMatchingMethod,
		fromDate: ValidDateTime,
		toDate: ValidDateTime,
	): LotLeg<TradeEventDerivative>[] {
		return legsOfLotsClosedInPeriod(
			this.lotMatcher.matchLots(method, grouping.derivativeTrades),
			fromDate,
			toDate,
		);
	}
}

function legsOfLotsClosedInPeriod<T extends { date: ValidDateTime }>(
	lots: MatchedLot<T>[],
	periodStart: ValidDateTime,
	periodEnd: ValidDateTime,
): LotLeg<T>[] {
	const closedInPeriod = lots.filter(
		(lot) => lot.sold.trade.date >= periodStart && lot.sold.trade.date <= periodEnd,
	);
	const legs = [
		...closedInPeriod.map((lot) => lot.acquired),
		...closedInPeriod.map((lot) => lot.sold),
	];
	return legs.sort((a, b) => a.trade.date.toMillis() - b.trade.date.toMillis());
}
