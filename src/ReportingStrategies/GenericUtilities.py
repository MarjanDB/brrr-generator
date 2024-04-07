from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar

import arrow as ar

import src.InfoProviders.InfoLookupProvider as ilp
import src.ReportingStrategies.GenericFormats as gf

TRADE_EVENT_TYPE = TypeVar("TRADE_EVENT_TYPE")


@dataclass
class TradeEventTrackingWrapper(Generic[TRADE_EVENT_TYPE]):
    Quantity: float
    Trade: TRADE_EVENT_TYPE


class GenericUtilities:
    def findStockEventById(
        self, id: str, allStocks: Sequence[gf.GenericTradeEvent]
    ) -> gf.GenericTradeEvent:
        filtered = filter(lambda trade: trade.ID == id, allStocks)
        return next(filtered)

    def findStockEventByDate(
        self, date: ar.Arrow, allStocks: Sequence[gf.GenericTradeEvent]
    ) -> Sequence[gf.GenericTradeEvent]:
        filtered = filter(lambda trade: trade.Date == date, allStocks)
        return list(filtered)

    # TODO: Create trade events based on corporate events
    def createMissingStockTradesFromCorporateActions(
        self,
    ) -> Sequence[gf.TradeEventStockAcquired | gf.TradeEventStockSold]:
        return []

    # TODO: Create trade events based on corporate events
    def createMissingDerivativeTradesFromCorporateActions(
        self,
    ) -> Sequence[gf.TradeEventDerivativeAcquired | gf.TradeEventDerivativeSold]:
        return []

    def processStockTrade(
        self, trade: gf.GenericTradeEventStaging
    ) -> gf.TradeEventStockAcquired | gf.TradeEventStockSold:
        if isinstance(trade, gf.TradeEventStagingStockAcquired):
            converted = gf.TradeEventStockAcquired(
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

        converted = gf.TradeEventStockSold(
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
        lot: gf.GenericTaxLotEventStaging,
        allTrades: Sequence[gf.TradeEventStockAcquired | gf.TradeEventStockSold],
    ) -> gf.TradeTaxLotEventStock:
        print("Processing stock lot (ID: {})".format(lot.ID))

        # TODO: Validate returns since buys and sells are merged
        # TODO: What to do when no match is found?
        try:
            matchingBuyById: gf.TradeEventStockAcquired = self.findStockEventById(
                lot.Acquired.ID or "", allTrades
            )
            matchingSoldByDate: gf.TradeEventStockSold = self.findStockEventByDate(
                lot.Sold.DateTime or ar.get("1-0-0"), allTrades
            )[0]

            print(
                "Matched Buy with trade (ID: {}, DateTime: {})".format(
                    matchingBuyById.ID, matchingBuyById.Date
                )
            )
            print(
                "Matched Sell with trade (ID: {}, DateTime: {})".format(
                    matchingSoldByDate.ID, matchingSoldByDate.Date
                )
            )
        except StopIteration:
            print(
                "Failed processing stock lot (ID: {}, ISIN: {}), found no match".format(
                    lot.ID, lot.ISIN
                )
            )
            raise LookupError

        processed = gf.TradeTaxLotEventStock(
            ID=lot.ID,
            ISIN=lot.ISIN,
            Quantity=lot.Quantity,
            Acquired=matchingBuyById,
            Sold=matchingSoldByDate,
            ShortLongType=gf.GenericShortLong.LONG,
        )

        return processed

    def processDerivativeTrade(
        self, trade: gf.GenericTradeEventStaging
    ) -> gf.TradeEventDerivativeAcquired | gf.TradeEventDerivativeSold:
        if isinstance(trade, gf.TradeEventDerivativeAcquired):
            converted = gf.TradeEventDerivativeAcquired(
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

        converted = gf.TradeEventDerivativeSold(
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
        lot: gf.GenericTaxLotEventStaging,
        allTrades: Sequence[
            gf.TradeEventDerivativeAcquired | gf.TradeEventDerivativeSold
        ],
    ) -> gf.TradeTaxLotEventDerivative:

        # TODO: Validate returns since buys and sells are merged
        # TODO: What to do when no match is found?
        try:
            matchingBuyById: gf.TradeEventDerivativeAcquired = self.findStockEventById(
                lot.Acquired.ID or "", allTrades
            )
            matchingSoldByDate: gf.TradeEventDerivativeSold = self.findStockEventByDate(
                lot.Sold.DateTime or ar.get("1-0-0"), allTrades
            )[0]
        except StopIteration:
            print(
                "Failed processing stock lot (ID: {}, ISIN: {}), found no match".format(
                    lot.ID, lot.ISIN
                )
            )
            raise LookupError

        processed = gf.TradeTaxLotEventDerivative(
            ID=lot.ID,
            ISIN=lot.ISIN,
            Quantity=lot.Quantity,
            Acquired=matchingBuyById,
            Sold=matchingSoldByDate,
            ShortLongType=gf.GenericShortLong.LONG,
        )

        return processed

    # TODO: Handle trades being referenced in multiple lots, so a many to many lots <-> trades relationships
    def processGenericGrouping(
        self, grouping: gf.GenericUnderlyingGroupingStaging
    ) -> gf.UnderlyingGrouping:
        stockTrades = grouping.StockTrades
        processedTrades = list(map(self.processStockTrade, stockTrades))
        tradesCausedByCorporateActions = list(
            self.createMissingStockTradesFromCorporateActions()
        )

        allTrades = processedTrades + tradesCausedByCorporateActions

        stockLots = grouping.StockTaxLots
        processedStockLots = list(
            map(lambda lot: self.processStockLot(lot, allTrades), stockLots)
        )

        derivativeTrades = grouping.DerivativeTrades
        processedDerivatives = list(map(self.processDerivativeTrade, derivativeTrades))
        derivativeCausedByCorporateActions = list(
            self.createMissingDerivativeTradesFromCorporateActions()
        )
        allDerivativeTrades = processedDerivatives + derivativeCausedByCorporateActions

        derivativeLots = grouping.DerivativeTaxLots
        porcessedDerivativeLots = list(
            map(
                lambda lot: self.processDerivativeLot(lot, allDerivativeTrades),
                derivativeLots,
            )
        )

        processed = gf.UnderlyingGrouping(
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

    def generateGenericGroupings(
        self, groupings: Sequence[gf.GenericUnderlyingGroupingStaging]
    ) -> Sequence[gf.UnderlyingGrouping]:
        processedGroupings = list(map(self.processGenericGrouping, groupings))
        return processedGroupings

    def getTradeLotMatchesWithQuantity(
        self,
        lots: Sequence[gf.TradeTaxLotEventStock],
        trades: Sequence[gf.TradeEventStockAcquired | gf.TradeEventStockSold],
    ):
        tradeAcquiredLotMatches: dict[
            str, TradeEventTrackingWrapper[gf.TradeEventStockAcquired]
        ] = dict()
        tradeSoldLotMatches: dict[
            str, TradeEventTrackingWrapper[gf.TradeEventStockSold]
        ] = dict()

        # TODO: Keep track of invalid Quantities
        for lot in lots:
            acquiredTrade = lot.Acquired
            existingEvent = tradeAcquiredLotMatches.get(
                acquiredTrade.ID, TradeEventTrackingWrapper(0, acquiredTrade)
            )
            existingEvent.Quantity += lot.Quantity
            tradeAcquiredLotMatches[acquiredTrade.ID] = existingEvent

            # NOTE: Lots subtract, as sells remove from holding
            soldTrade = lot.Sold
            existingEvent = tradeSoldLotMatches.get(
                soldTrade.ID, TradeEventTrackingWrapper(0, soldTrade)
            )
            existingEvent.Quantity += -lot.Quantity
            tradeSoldLotMatches[soldTrade.ID] = existingEvent

        def convertBuyTrade(
            trade: TradeEventTrackingWrapper[gf.TradeEventStockAcquired],
        ) -> gf.TradeEventStockAcquired:
            converted = gf.TradeEventStockAcquired(
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
            trade: TradeEventTrackingWrapper[gf.TradeEventStockSold],
        ) -> gf.TradeEventStockSold:
            converted = gf.TradeEventStockSold(
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

        convertedBuyTrades = list(
            map(convertBuyTrade, tradeAcquiredLotMatches.values())
        )
        convertedSellTrades = list(map(convertSellTrade, tradeSoldLotMatches.values()))

        allTrades = convertedBuyTrades + convertedSellTrades

        return allTrades

    def generateInterestingUnderlyingGrouping(
        self, grouping: gf.UnderlyingGrouping
    ) -> gf.UnderlyingGroupingWithTradesOfInterest:
        stockTrades = grouping.StockTrades
        stockLots = grouping.StockTaxLots

        stockTradesOfInterest = self.getTradeLotMatchesWithQuantity(
            stockLots, stockTrades
        )

        interestingGrouping = gf.UnderlyingGroupingWithTradesOfInterest(
            ISIN=grouping.ISIN,
            CountryOfOrigin=grouping.CountryOfOrigin,
            UnderlyingCategory=grouping.UnderlyingCategory,
            StockTrades=stockTradesOfInterest,
            DerivativeTrades=[],
            Dividends=grouping.Dividends,
        )

        return interestingGrouping

    def generateInterestingUnderlyingGroupings(
        self, groupings: Sequence[gf.UnderlyingGrouping]
    ) -> Sequence[gf.UnderlyingGroupingWithTradesOfInterest]:
        processedGroupings = list(
            map(self.generateInterestingUnderlyingGrouping, groupings)
        )
        return processedGroupings
