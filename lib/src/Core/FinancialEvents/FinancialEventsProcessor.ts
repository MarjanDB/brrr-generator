import type { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { LotLeg, MatchedLot } from "@brrr/Core/LotMatching/MatchedLot";
import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import {
	UnderlyingDerivativeGrouping,
	UnderlyingGroupingWithTradesOfInterest,
} from "@brrr/Core/Schemas/Grouping";
import type { LotMatchingConfiguration } from "@brrr/Core/Schemas/LotMatchingConfiguration";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export class FinancialEventsProcessor {
	private lotMatcher: LotMatcher;

	constructor(_processingUtils: unknown, lotMatcher: LotMatcher) {
		this.lotMatcher = lotMatcher;
	}

	// Note: since the LotMatcher is stateful, a new LotMatchingMethod instance must be created
	// for each financial grouping (done via lotMatchingConfiguration.forStocks/forDerivatives).
	process(
		input: FinancialGrouping,
		lotMatchingConfiguration: LotMatchingConfiguration,
	): UnderlyingGroupingWithTradesOfInterest {
		const lotMatcher = this.lotMatcher;

		const lotMatchingMethodInstance = lotMatchingConfiguration.forStocks(
			input,
		) as unknown as LotMatchingMethod;
		const stockLotLegs = legsOfLotsClosedInPeriod(
			lotMatcher.matchLots(lotMatchingMethodInstance, input.stockTrades),
			lotMatchingConfiguration.fromDate,
			lotMatchingConfiguration.toDate,
		);

		const derivativeGroupingsOfInterest: UnderlyingDerivativeGrouping[] = [];
		for (const derivativeGrouping of input.derivativeGroupings) {
			const derivMethodInstance = lotMatchingConfiguration.forDerivatives(
				input,
			) as unknown as LotMatchingMethod;
			derivativeGroupingsOfInterest.push(
				new UnderlyingDerivativeGrouping({
					financialIdentifier: derivativeGrouping.financialIdentifier,
					derivativeLotLegs: legsOfLotsClosedInPeriod(
						lotMatcher.matchLots(derivMethodInstance, derivativeGrouping.derivativeTrades),
						lotMatchingConfiguration.fromDate,
						lotMatchingConfiguration.toDate,
					),
				}),
			);
		}

		return new UnderlyingGroupingWithTradesOfInterest({
			financialIdentifier: input.financialIdentifier,
			countryOfOrigin: input.countryOfOrigin,
			underlyingCategory: input.underlyingCategory,
			stockLotLegs,
			derivativeGroupings: derivativeGroupingsOfInterest,
			cashTransactions: input.cashTransactions,
		});
	}

	generateInterestingUnderlyingGroupings(
		groupings: FinancialGrouping[],
		lotMatchingMethod: LotMatchingConfiguration,
	): UnderlyingGroupingWithTradesOfInterest[] {
		return groupings.map((g) => this.process(g, lotMatchingMethod));
	}
}

// The legs of the lots closed in the period, in date order: the trades a capital gains report
// lists, each with the lot's share of it.
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
