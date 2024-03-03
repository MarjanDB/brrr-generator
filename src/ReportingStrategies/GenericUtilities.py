import src.InfoProviders.InfoLookupProvider as ilp
import src.ReportingStrategies.GenericFormats as gf
from typing import Sequence
import arrow as ar

class GenericUtilities:
    def findStockEventById(self, id: str, allStocks: Sequence[gf.GenericTradeEvent]) -> gf.GenericTradeEvent:
        filtered = filter(lambda trade: trade.ID == id, allStocks)
        return next(filtered)
    
    def findStockEventByDate(self, date: ar.Arrow, allStocks: Sequence[gf.GenericTradeEvent]) -> gf.GenericTradeEvent:
        filtered = filter(lambda trade: trade.Date == date, allStocks)
        return next(filtered)

    # TODO: Create trade events based on corporate events
    def createMissingStockTradesFromCorporateActions(self) -> Sequence[gf.TradeEventStockAcquired | gf.TradeEventStockSold]:
        return []
    

    def processStockTrade(self, trade: gf.GenericTradeEventStaging) -> gf.TradeEventStockAcquired | gf.TradeEventStockSold:
        if isinstance(trade, gf.TradeEventStagingStockAcquired):
            converted = gf.TradeEventStockAcquired(
                ID = trade.ID,
                ISIN = trade.ISIN,
                AssetClass = trade.AssetClass,
                Date = trade.Date,
                Quantity = trade.Quantity,
                AmountPerQuantity = trade.AmountPerQuantity,
                TotalAmount = trade.TotalAmount,
                TaxTotal = trade.TaxTotal,
                Multiplier = trade.Multiplier,
                AcquiredReason = trade.AcquiredReason
            )
            return converted
        
        converted = gf.TradeEventStockSold(
            ID = trade.ID,
            ISIN = trade.ISIN,
            AssetClass = trade.AssetClass,
            Date = trade.Date,
            Quantity = trade.Quantity,
            AmountPerQuantity = trade.AmountPerQuantity,
            TotalAmount = trade.TotalAmount,
            TaxTotal = trade.TaxTotal,
            Multiplier = trade.Multiplier
        )
        return converted

    def processStockLot(self, lot: gf.GenericTaxLotEventStaging, allTrades: Sequence[gf.TradeEventStockAcquired | gf.TradeEventStockSold]) -> gf.TradeTaxLotEventStock:

        # TODO: Validate returns since buys and sells are merged
        # TODO: What to do when no match is found?
        matchingBuyById : gf.TradeEventStockAcquired = self.findStockEventById(lot.Acquired.ID or "", allTrades)
        matchingSoldByDate : gf.TradeEventStockSold = self.findStockEventByDate(lot.Sold.DateTime or ar.get("1-0-0"), allTrades)

        processed = gf.TradeTaxLotEventStock(
            ID = lot.ID,
            ISIN = lot.ISIN,
            Quantity = lot.Quantity,
            Acquired = matchingBuyById, 
            Sold = matchingSoldByDate,
            ShortLongType = gf.GenericShortLong.LONG
        )

        return processed



    def processGenericGrouping(self, grouping: gf.GenericUnderlyingGroupingStaging) -> gf.UnderlyingGrouping:
        stockTrades = grouping.StockTrades
        processedTrades = list(map(self.processStockTrade, stockTrades))
        tradesCausedByCorporateActions = list(self.createMissingStockTradesFromCorporateActions())

        allTrades = processedTrades + tradesCausedByCorporateActions
        
        stockLots = grouping.StockTaxLots
        processedStockLots = list(map(lambda lot: self.processStockLot(lot, allTrades), stockLots))




        processed = gf.UnderlyingGrouping(
            ISIN = grouping.ISIN,
            CountryOfOrigin = grouping.CountryOfOrigin,
            UnderlyingCategory = grouping.UnderlyingCategory,
            StockTrades = allTrades,
            StockTaxLots = processedStockLots,
            DerivativeTrades = [],
            DerivativeTaxLots = [],
            Dividends = []
        )
        return processed







    def processGenericGroupings(self, groupings: Sequence[gf.GenericUnderlyingGroupingStaging]) -> Sequence[gf.UnderlyingGrouping]:
        processedGroupings = list(map(self.processGenericGrouping, groupings))
        return processedGroupings

