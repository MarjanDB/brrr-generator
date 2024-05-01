from typing import Sequence

import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Utils.ProcessingUtils import ProcessingUtils
from Core.LotMatching.LotMatchingMethods.ProvidedLotMatchingMethod import (
    ProvidedLotMatchingMethod,
)
from Core.LotMatching.Services.LotMatcher import LotMatcher


class FinancialEventsProcessor:

    def __init__(
        self,
        processingUtils: ProcessingUtils,
        lotMatcher: LotMatcher,
    ) -> None:
        self.lotMatcher = lotMatcher
        self.processingUtils = processingUtils

    def process(self, input: pgf.FinancialGrouping) -> pgf.UnderlyingGroupingWithTradesOfInterest:
        stockLots = input.StockTaxLots
        derivativeLots = input.DerivativeTaxLots

        lotMatcher = self.lotMatcher
        stockTradesOfInterest = lotMatcher.matchLotsWithGenericTradeEvents(ProvidedLotMatchingMethod(stockLots), input.StockTrades)

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
        self, groupings: Sequence[pgf.FinancialGrouping]
    ) -> Sequence[pgf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(map(self.process, groupings))
        return processedGroupings
