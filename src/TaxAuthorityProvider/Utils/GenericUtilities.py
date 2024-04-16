from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar

import arrow as ar

import src.Core.FinancialEvents.Schemas.CommonFormats as cf
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf

TRADE_EVENT_TYPE = TypeVar("TRADE_EVENT_TYPE")


@dataclass
class TradeEventTrackingWrapper(Generic[TRADE_EVENT_TYPE]):
    Quantity: float
    Trade: TRADE_EVENT_TYPE


class GenericUtilities:
    def findStockEventById(self, id: str, allStocks: Sequence[pgf.GenericTradeEvent]) -> pgf.GenericTradeEvent:
        filtered = filter(lambda trade: trade.ID == id, allStocks)
        return next(filtered)

    def findStockEventByDate(self, date: ar.Arrow, allStocks: Sequence[pgf.GenericTradeEvent]) -> Sequence[pgf.GenericTradeEvent]:
        filtered = filter(lambda trade: trade.Date == date, allStocks)
        return list(filtered)

    # TODO: Create trade events based on corporate events
    def createMissingStockTradesFromCorporateActions(
        self,
    ) -> Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold]:
        return []

    # TODO: Create trade events based on corporate events
    def createMissingDerivativeTradesFromCorporateActions(
        self,
    ) -> Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold]:
        return []

    def processStockTrade(self, trade: sgf.GenericTradeEventStaging) -> pgf.TradeEventStockAcquired | pgf.TradeEventStockSold:
        if isinstance(trade, sgf.TradeEventStagingStockAcquired):
            converted = pgf.TradeEventStockAcquired(
                ID=trade.ID,
                ISIN=trade.ISIN,
                Ticker=trade.Ticker or "",
                AssetClass=trade.AssetClass,
                Date=trade.Date,
                Multiplier=trade.Multiplier,
                AcquiredReason=trade.AcquiredReason,
                ExchangedMoney=trade.ExchangedMoney,
            )
            return converted

        converted = pgf.TradeEventStockSold(
            ID=trade.ID,
            ISIN=trade.ISIN,
            Ticker=trade.Ticker or "",
            AssetClass=trade.AssetClass,
            Date=trade.Date,
            Multiplier=trade.Multiplier,
            ExchangedMoney=trade.ExchangedMoney,
        )
        return converted

    def processStockLot(
        self,
        lot: sgf.GenericTaxLotEventStaging,
        allTrades: Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold],
    ) -> pgf.TradeTaxLotEventStock:
        # print("Processing stock lot (ID: {})".format(lot.ID))

        # TODO: Validate returns since buys and sells are merged
        # TODO: What to do when no match is found?
        try:
            matchingBuyById: pgf.TradeEventStockAcquired = self.findStockEventById(lot.Acquired.ID or "", allTrades)
            matchingSoldByDate: pgf.TradeEventStockSold = self.findStockEventByDate(lot.Sold.DateTime or ar.get("1-0-0"), allTrades)[0]

            # print("Matched Buy with trade (ID: {}, DateTime: {})".format(matchingBuyById.ID, matchingBuyById.Date))
            # print("Matched Sell with trade (ID: {}, DateTime: {})".format(matchingSoldByDate.ID, matchingSoldByDate.Date))
        except StopIteration:
            print("Failed processing stock lot (ID: {}, ISIN: {}), found no match".format(lot.ID, lot.ISIN))
            raise StopIteration

        processed = pgf.TradeTaxLotEventStock(
            ID=lot.ID,
            ISIN=lot.ISIN,
            Quantity=lot.Quantity,
            Acquired=matchingBuyById,
            Sold=matchingSoldByDate,
            ShortLongType=cf.GenericShortLong.LONG,
        )

        return processed

    def processDerivativeTrade(
        self, trade: sgf.GenericTradeEventStaging
    ) -> pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold:
        if isinstance(trade, pgf.TradeEventDerivativeAcquired):
            converted = pgf.TradeEventDerivativeAcquired(
                ID=trade.ID,
                ISIN=trade.ISIN,
                Ticker=trade.Ticker or "",
                AssetClass=trade.AssetClass,
                Date=trade.Date,
                Multiplier=trade.Multiplier,
                AcquiredReason=trade.AcquiredReason,
                ExchangedMoney=trade.ExchangedMoney,
            )
            return converted

        converted = pgf.TradeEventDerivativeSold(
            ID=trade.ID,
            ISIN=trade.ISIN,
            Ticker=trade.Ticker or "",
            AssetClass=trade.AssetClass,
            Date=trade.Date,
            Multiplier=trade.Multiplier,
            ExchangedMoney=trade.ExchangedMoney,
        )
        return converted

    def processDerivativeLot(
        self,
        lot: sgf.GenericTaxLotEventStaging,
        allTrades: Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold],
    ) -> pgf.TradeTaxLotEventDerivative:

        # TODO: Validate returns since buys and sells are merged
        # TODO: What to do when no match is found?
        try:
            matchingBuyById: pgf.TradeEventDerivativeAcquired = self.findStockEventById(lot.Acquired.ID or "", allTrades)
            matchingSoldByDate: pgf.TradeEventDerivativeSold = self.findStockEventByDate(lot.Sold.DateTime or ar.get("1-0-0"), allTrades)[0]
        except StopIteration:
            print("Failed processing stock lot (ID: {}, ISIN: {}), found no match".format(lot.ID, lot.ISIN))
            raise StopIteration

        processed = pgf.TradeTaxLotEventDerivative(
            ID=lot.ID,
            ISIN=lot.ISIN,
            Quantity=lot.Quantity,
            Acquired=matchingBuyById,
            Sold=matchingSoldByDate,
            ShortLongType=cf.GenericShortLong.LONG,
        )

        return processed

    # TODO: Handle trades being referenced in multiple lots, so a many to many lots <-> trades relationships
    def processGenericGrouping(self, grouping: sgf.GenericUnderlyingGroupingStaging) -> pgf.UnderlyingGrouping:
        stockTrades = grouping.StockTrades
        processedTrades = list(map(self.processStockTrade, stockTrades))
        tradesCausedByCorporateActions = list(self.createMissingStockTradesFromCorporateActions())

        allTrades = processedTrades + tradesCausedByCorporateActions

        stockLots = grouping.StockTaxLots
        processedStockLots = list(map(lambda lot: self.processStockLot(lot, allTrades), stockLots))

        derivativeTrades = grouping.DerivativeTrades
        processedDerivatives = list(map(self.processDerivativeTrade, derivativeTrades))
        derivativeCausedByCorporateActions = list(self.createMissingDerivativeTradesFromCorporateActions())
        allDerivativeTrades = processedDerivatives + derivativeCausedByCorporateActions

        derivativeLots = grouping.DerivativeTaxLots
        porcessedDerivativeLots = list(
            map(
                lambda lot: self.processDerivativeLot(lot, allDerivativeTrades),
                derivativeLots,
            )
        )

        processed = pgf.UnderlyingGrouping(
            ISIN=grouping.ISIN,
            CountryOfOrigin=grouping.CountryOfOrigin,
            UnderlyingCategory=grouping.UnderlyingCategory,
            StockTrades=allTrades,
            StockTaxLots=processedStockLots,
            DerivativeTrades=allDerivativeTrades,
            DerivativeTaxLots=porcessedDerivativeLots,
            Dividends=[],
        )
        return processed

    def generateGenericGroupings(self, groupings: Sequence[sgf.GenericUnderlyingGroupingStaging]) -> Sequence[pgf.UnderlyingGrouping]:
        processedGroupings = list(map(self.processGenericGrouping, groupings))
        return processedGroupings

    def getTradeLotMatchesWithQuantity(
        self,
        lots: Sequence[pgf.TradeTaxLotEventStock],
        trades: Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold],
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

    def generateInterestingUnderlyingGrouping(self, grouping: pgf.UnderlyingGrouping) -> pgf.UnderlyingGroupingWithTradesOfInterest:
        stockTrades = grouping.StockTrades
        stockLots = grouping.StockTaxLots

        stockTradesOfInterest = self.getTradeLotMatchesWithQuantity(stockLots, stockTrades)

        interestingGrouping = pgf.UnderlyingGroupingWithTradesOfInterest(
            ISIN=grouping.ISIN,
            CountryOfOrigin=grouping.CountryOfOrigin,
            UnderlyingCategory=grouping.UnderlyingCategory,
            StockTrades=stockTradesOfInterest,
            DerivativeTrades=[],
            Dividends=grouping.Dividends,
        )

        return interestingGrouping

    def generateInterestingUnderlyingGroupings(
        self, groupings: Sequence[pgf.UnderlyingGrouping]
    ) -> Sequence[pgf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(map(self.generateInterestingUnderlyingGrouping, groupings))
        return processedGroupings
