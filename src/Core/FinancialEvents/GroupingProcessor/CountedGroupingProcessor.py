from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar

import src.Core.FinancialEvents.Contracts.GroupingProcessor as gp
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf

TRADE_EVENT_TYPE = TypeVar("TRADE_EVENT_TYPE")


@dataclass
class TradeEventTrackingWrapper(Generic[TRADE_EVENT_TYPE]):
    Quantity: float
    Trade: TRADE_EVENT_TYPE


class CountedGroupingProcessor(gp.GroupingProcessor[pgf.UnderlyingGrouping, pgf.UnderlyingGroupingWithTradesOfInterest]):

    def getTradeLotMatchesWithQuantity(
        self,
        lots: Sequence[pgf.TradeTaxLotEventStock],
    ):
        tradeAcquiredLotMatches: dict[str, TradeEventTrackingWrapper[pgf.TradeEventStockAcquired]] = dict()
        tradeSoldLotMatches: dict[str, TradeEventTrackingWrapper[pgf.TradeEventStockSold]] = dict()

        # TODO: Keep track of invalid Quantities
        for lot in lots:
            acquiredTrade = lot.Acquired
            existingEvent = tradeAcquiredLotMatches.get(acquiredTrade.ID, TradeEventTrackingWrapper(0, acquiredTrade))
            existingEvent.Quantity += lot.Quantity
            tradeAcquiredLotMatches[acquiredTrade.ID] = existingEvent

            # NOTE: Lots subtract, as sells remove from holding
            soldTrade = lot.Sold
            existingEvent = tradeSoldLotMatches.get(soldTrade.ID, TradeEventTrackingWrapper(0, soldTrade))
            existingEvent.Quantity += -lot.Quantity
            tradeSoldLotMatches[soldTrade.ID] = existingEvent

        def convertBuyTrade(
            trade: TradeEventTrackingWrapper[pgf.TradeEventStockAcquired],
        ) -> pgf.TradeEventStockAcquired:
            converted = pgf.TradeEventStockAcquired(
                ID=trade.Trade.ID,
                ISIN=trade.Trade.ISIN,
                Ticker=trade.Trade.Ticker,
                AssetClass=trade.Trade.AssetClass,
                Date=trade.Trade.Date,
                Multiplier=trade.Trade.Multiplier,
                AcquiredReason=trade.Trade.AcquiredReason,
                ExchangedMoney=trade.Trade.ExchangedMoney,
            )
            return converted

        def convertSellTrade(
            trade: TradeEventTrackingWrapper[pgf.TradeEventStockSold],
        ) -> pgf.TradeEventStockSold:
            converted = pgf.TradeEventStockSold(
                ID=trade.Trade.ID,
                ISIN=trade.Trade.ISIN,
                Ticker=trade.Trade.Ticker,
                AssetClass=trade.Trade.AssetClass,
                Date=trade.Trade.Date,
                Multiplier=trade.Trade.Multiplier,
                ExchangedMoney=trade.Trade.ExchangedMoney,
            )

            # TODO: Because IBKR does not provide IDs for what closed the lot, we come across a problem where if multiple lots closed at the same time, we're unable to distinguish between closing trades
            # I'm just using this hack for now, but this needs to be fixed specifically for IBKR so that imports for other brokers will work properly
            converted.ExchangedMoney.UnderlyingQuantity = trade.Quantity

            return converted

        convertedBuyTrades = list(map(convertBuyTrade, tradeAcquiredLotMatches.values()))
        convertedSellTrades = list(map(convertSellTrade, tradeSoldLotMatches.values()))

        allTrades = convertedBuyTrades + convertedSellTrades

        return allTrades

    def process(self, input: pgf.UnderlyingGrouping) -> pgf.UnderlyingGroupingWithTradesOfInterest:
        stockLots = input.StockTaxLots

        stockTradesOfInterest = self.getTradeLotMatchesWithQuantity(stockLots)

        interestingGrouping = pgf.UnderlyingGroupingWithTradesOfInterest(
            ISIN=input.ISIN,
            CountryOfOrigin=input.CountryOfOrigin,
            UnderlyingCategory=input.UnderlyingCategory,
            StockTrades=stockTradesOfInterest,
            DerivativeTrades=[],
            CashTransactions=input.CashTransactions,
        )

        return interestingGrouping

    def generateInterestingUnderlyingGroupings(
        self, groupings: Sequence[pgf.UnderlyingGrouping]
    ) -> Sequence[pgf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(map(self.process, groupings))
        return processedGroupings
