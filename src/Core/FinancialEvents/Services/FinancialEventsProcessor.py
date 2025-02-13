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

        lotMatchingMethodInstance = lotMatchingConfiguration.ForDerivatives(input)
        derivativeTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(lotMatchingMethodInstance, input.DerivativeTrades)

        stockTradesOfInterestFiltered = stockTradesOfInterest.getTradesOfLotsClosedInPeriod(
            periodStart=lotMatchingConfiguration.fromDate, periodEnd=lotMatchingConfiguration.toDate
        )

        derivativeTradesOfInterestFiltered = derivativeTradesOfInterest.getTradesOfLotsClosedInPeriod(
            periodStart=lotMatchingConfiguration.fromDate, periodEnd=lotMatchingConfiguration.toDate
        )

        interestingGrouping = pgf.UnderlyingGroupingWithTradesOfInterest(
            ISIN=input.GroupingIdentity.getIsin(),  # TODO: Underlying group should use a mutli-identifier approach, not striaght up ISIN
            CountryOfOrigin=input.CountryOfOrigin,
            UnderlyingCategory=input.UnderlyingCategory,
            StockTrades=stockTradesOfInterestFiltered.Trades,  # TODO: Types
            DerivativeTrades=derivativeTradesOfInterestFiltered.Trades,  # TODO: Types
            CashTransactions=input.CashTransactions,
        )

        return interestingGrouping

    def generateInterestingUnderlyingGroupings(
        self, groupings: Sequence[pgf.FinancialGrouping], lotMatchingMethod: LotMatchingConfiguration
    ) -> Sequence[pgf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(map(lambda grouping: self.process(grouping, lotMatchingMethod), groupings))
        return processedGroupings
