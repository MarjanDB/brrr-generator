from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar

import src.Core.FinancialEvents.EventProcessors.DerivativeEventProcessor as dep
import src.Core.FinancialEvents.EventProcessors.StockEventProcessor as sep
import src.Core.FinancialEvents.LotProcessors.DerivativeLotProcessor as dlp
import src.Core.FinancialEvents.LotProcessors.StockLotProcessor as slp
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf
import src.Core.FinancialEvents.Utils.ProcessingUtils as pu

TRADE_EVENT_TYPE = TypeVar("TRADE_EVENT_TYPE")


@dataclass
class TradeEventTrackingWrapper(Generic[TRADE_EVENT_TYPE]):
    Quantity: float
    Trade: TRADE_EVENT_TYPE


class StagingToUnderlyingProcessor:
    stockProcessor: sep.StockEventProcessor
    derivativeProcessor: dep.DerivativeEventProcessor

    stockLotProcessor: slp.StockLotProcessor
    derivativeLotProcessor: dlp.DerivativeLotProcessor

    def __init__(self) -> None:
        utils = pu.ProcessingUtils()
        self.stockProcessor = sep.StockEventProcessor(utils)
        self.derivativeProcessor = dep.DerivativeEventProcessor(utils)
        self.stockLotProcessor = slp.StockLotProcessor(utils)
        self.derivativeLotProcessor = dlp.DerivativeLotProcessor(utils)

    def processGenericGrouping(self, grouping: sgf.GenericUnderlyingGroupingStaging) -> pgf.UnderlyingGrouping:
        stockTrades = grouping.StockTrades
        processedTrades = list(map(self.stockProcessor.process, stockTrades))
        tradesCausedByCorporateActions = list(self.stockProcessor.createMissingStockTradesFromCorporateActions())

        allTrades = processedTrades + tradesCausedByCorporateActions

        stockLots = grouping.StockTaxLots
        processedStockLots = list(map(lambda lot: self.stockLotProcessor.process(lot, allTrades), stockLots))

        derivativeTrades = grouping.DerivativeTrades
        processedDerivatives = list(map(self.derivativeProcessor.process, derivativeTrades))
        derivativeCausedByCorporateActions = list(self.derivativeProcessor.createMissingDerivativeTradesFromCorporateActions())
        allDerivativeTrades = processedDerivatives + derivativeCausedByCorporateActions

        derivativeLots = grouping.DerivativeTaxLots
        porcessedDerivativeLots = list(
            map(
                lambda lot: self.derivativeLotProcessor.process(lot, allDerivativeTrades),
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
        stockLots = grouping.StockTaxLots

        stockTradesOfInterest = self.getTradeLotMatchesWithQuantity(stockLots)

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
