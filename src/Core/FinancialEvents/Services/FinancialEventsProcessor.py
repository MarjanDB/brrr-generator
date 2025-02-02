from typing import Callable, Sequence

import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Schemas.LotMatchingConfiguration import (
    LotMatchingConfiguration,
)
from Core.FinancialEvents.Utils.ProcessingUtils import ProcessingUtils
from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Services.LotMatcher import LotMatcher


class FinancialEventsProcessor:

    def __init__(
        self,
        processingUtils: ProcessingUtils,
        lotMatcher: LotMatcher,
    ) -> None:
        self.lotMatcher = lotMatcher
        self.processingUtils = processingUtils

    def process(
        self, input: pgf.FinancialGrouping, lotMatchingMethod: LotMatchingConfiguration
    ) -> pgf.UnderlyingGroupingWithTradesOfInterest:
        lotMatcher = self.lotMatcher

        lotMatchingMethodInstance = lotMatchingMethod.ForStocks(input)
        stockTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(lotMatchingMethodInstance, input.StockTrades)

        lotMatchingMethodInstance = lotMatchingMethod.ForDerivatives(input)
        derivativeTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(lotMatchingMethodInstance, input.DerivativeTrades)

        interestingGrouping = pgf.UnderlyingGroupingWithTradesOfInterest(
            ISIN=input.ISIN,
            CountryOfOrigin=input.CountryOfOrigin,
            UnderlyingCategory=input.UnderlyingCategory,
            StockTrades=stockTradesOfInterest.Trades,  # TODO: Types
            DerivativeTrades=derivativeTradesOfInterest.Trades,  # TODO: Types
            CashTransactions=input.CashTransactions,
        )

        return interestingGrouping

    def generateInterestingUnderlyingGroupings(
        self, groupings: Sequence[pgf.FinancialGrouping], lotMatchingMethod: LotMatchingConfiguration
    ) -> Sequence[pgf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(map(lambda grouping: self.process(grouping, lotMatchingMethod), groupings))
        return processedGroupings
