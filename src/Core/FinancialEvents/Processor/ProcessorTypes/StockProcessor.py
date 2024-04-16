from typing import Sequence

import arrow as ar

import src.Core.FinancialEvents.Schemas.CommonFormats as cf
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf


class StockProcessor:
    # TODO: Create trade events based on corporate events
    def createMissingStockTradesFromCorporateActions(
        self,
    ) -> Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold]:
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
