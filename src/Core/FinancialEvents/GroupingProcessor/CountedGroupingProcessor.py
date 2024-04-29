from typing import Sequence

import src.Core.FinancialEvents.Contracts.GroupingProcessor as gp
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
from src.Core.LotMatching.LotMatchingMethods.ProvidedLotMatchingMethod import (
    ProvidedLotMatchingMethod,
)


class CountedGroupingProcessor(gp.GroupingProcessor[pgf.UnderlyingGrouping, pgf.UnderlyingGroupingWithTradesOfInterest]):

    def process(self, input: pgf.UnderlyingGrouping) -> pgf.UnderlyingGroupingWithTradesOfInterest:
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
        self, groupings: Sequence[pgf.UnderlyingGrouping]
    ) -> Sequence[pgf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(map(self.process, groupings))
        return processedGroupings
