from typing import Sequence

import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Schemas.LotMatchingConfiguration import (
    LotMatchingConfiguration,
)
from Core.FinancialEvents.Utils.ProcessingUtils import ProcessingUtils
from Core.LotMatching.Services.LotMatcher import LotMatcher


class FinancialEventsProcessor:
    """
    Note that since the LotMatcher is stateful, we need to create a new instance for each financial grouping.
    """

    def __init__(
        self,
        processingUtils: ProcessingUtils,
        lotMatcher: LotMatcher,
    ) -> None:
        self.lotMatcher = lotMatcher
        self.processingUtils = processingUtils

    def process(
        self, input: pgf.FinancialGrouping, lotMatchingConfiguration: LotMatchingConfiguration
    ) -> pgf.UnderlyingGroupingWithTradesOfInterest:
        lotMatcher = self.lotMatcher

        lotMatchingMethodInstance = lotMatchingConfiguration.ForStocks(input)
        stockTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(lotMatchingMethodInstance, input.StockTrades)

        stockTradesOfInterestFiltered = stockTradesOfInterest.getTradesOfLotsClosedInPeriod(
            periodStart=lotMatchingConfiguration.fromDate, periodEnd=lotMatchingConfiguration.toDate
        )

        derivativeGroupingsOfInterest: list[pgf.UnderlyingDerivativeGrouping] = []
        for derivativeGrouping in input.DerivativeGroupings:
            lotMatchingMethodInstance = lotMatchingConfiguration.ForDerivatives(input)
            derivativeTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(
                lotMatchingMethodInstance, derivativeGrouping.DerivativeTrades
            )

            derivativeTradesOfInterestFiltered = derivativeTradesOfInterest.getTradesOfLotsClosedInPeriod(
                periodStart=lotMatchingConfiguration.fromDate, periodEnd=lotMatchingConfiguration.toDate
            )

            derivativeGroupingsOfInterest.append(
                pgf.UnderlyingDerivativeGrouping(
                    FinancialIdentifier=derivativeGrouping.FinancialIdentifier,
                    DerivativeTrades=derivativeTradesOfInterestFiltered.Trades,  # TODO: Types
                )
            )

        interestingGrouping = pgf.UnderlyingGroupingWithTradesOfInterest(
            FinancialIdentifier=input.FinancialIdentifier,
            CountryOfOrigin=input.CountryOfOrigin,
            UnderlyingCategory=input.UnderlyingCategory,
            StockTrades=stockTradesOfInterestFiltered.Trades,  # TODO: Types
            DerivativeGroupings=derivativeGroupingsOfInterest,
            CashTransactions=input.CashTransactions,
        )

        return interestingGrouping

    def generateInterestingUnderlyingGroupings(
        self, groupings: Sequence[pgf.FinancialGrouping], lotMatchingMethod: LotMatchingConfiguration
    ) -> Sequence[pgf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(map(lambda grouping: self.process(grouping, lotMatchingMethod), groupings))
        return processedGroupings
