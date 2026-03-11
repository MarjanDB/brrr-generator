import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import { UnderlyingDerivativeGrouping, UnderlyingGroupingWithTradesOfInterest } from "@brrr/Core/Schemas/Grouping.ts";
import type { LotMatchingConfiguration } from "@brrr/Core/Schemas/LotMatchingConfiguration.ts";
import type { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod.ts";

export class FinancialEventsProcessor {
	private lotMatcher: LotMatcher;

	constructor(_processingUtils: unknown, lotMatcher: LotMatcher) {
		this.lotMatcher = lotMatcher;
	}

	// Note: since the LotMatcher is stateful, a new LotMatchingMethod instance must be created
	// for each financial grouping (done via lotMatchingConfiguration.forStocks/forDerivatives).
	process(input: FinancialGrouping, lotMatchingConfiguration: LotMatchingConfiguration): UnderlyingGroupingWithTradesOfInterest {
		const lotMatcher = this.lotMatcher;

		const lotMatchingMethodInstance = lotMatchingConfiguration.forStocks(input) as unknown as LotMatchingMethod;
		const stockTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(lotMatchingMethodInstance, input.stockTrades);

		const stockTradesOfInterestFiltered = stockTradesOfInterest.getTradesOfLotsClosedInPeriod(
			lotMatchingConfiguration.fromDate,
			lotMatchingConfiguration.toDate,
		);

		const derivativeGroupingsOfInterest: UnderlyingDerivativeGrouping[] = [];
		for (const derivativeGrouping of input.derivativeGroupings) {
			const derivMethodInstance = lotMatchingConfiguration.forDerivatives(input) as unknown as LotMatchingMethod;
			const derivativeTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(
				derivMethodInstance,
				derivativeGrouping.derivativeTrades,
			);

			const derivativeTradesOfInterestFiltered = derivativeTradesOfInterest.getTradesOfLotsClosedInPeriod(
				lotMatchingConfiguration.fromDate,
				lotMatchingConfiguration.toDate,
			);

			derivativeGroupingsOfInterest.push(
				new UnderlyingDerivativeGrouping({
					financialIdentifier: derivativeGrouping.financialIdentifier,
					derivativeTrades: derivativeTradesOfInterestFiltered.trades as never,
				}),
			);
		}

		return new UnderlyingGroupingWithTradesOfInterest({
			financialIdentifier: input.financialIdentifier,
			countryOfOrigin: input.countryOfOrigin,
			underlyingCategory: input.underlyingCategory,
			stockTrades: stockTradesOfInterestFiltered.trades as never,
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
