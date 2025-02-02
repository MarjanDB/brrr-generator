from typing import Callable, Sequence

import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Utils.ProcessingUtils import ProcessingUtils
from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Services.LotMatcher import LotMatcher
from Core.LotMatching.Services.LotMatchingMethods.ProvidedLotMatchingMethod import (
    ProvidedLotMatchingMethod,
)


class FinancialEventsProcessor:

    def __init__(
        self,
        processingUtils: ProcessingUtils,
        lotMatcher: LotMatcher,
    ) -> None:
        self.lotMatcher = lotMatcher
        self.processingUtils = processingUtils

    def process(
        self, input: pgf.FinancialGrouping, lotMatchingMethod: Callable[[pgf.FinancialGrouping], LotMatchingMethod]
    ) -> pgf.UnderlyingGroupingWithTradesOfInterest:
        derivativeLots = input.DerivativeTaxLots
        lotMatchingMethodInstance = lotMatchingMethod(input)

        lotMatcher = self.lotMatcher
        stockTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(lotMatchingMethodInstance, input.StockTrades)

        derivativeTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(
            ProvidedLotMatchingMethod(derivativeLots), input.DerivativeTrades
        )

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
        self, groupings: Sequence[pgf.FinancialGrouping], lotMatchingMethod: Callable[[pgf.FinancialGrouping], LotMatchingMethod]
    ) -> Sequence[pgf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(map(lambda grouping: self.process(grouping, lotMatchingMethod), groupings))
        return processedGroupings
