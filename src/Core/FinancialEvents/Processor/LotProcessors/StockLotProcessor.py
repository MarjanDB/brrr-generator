from typing import Sequence

import arrow as ar

import src.Core.FinancialEvents.Processor.Contracts.LotProcessor as lp
import src.Core.FinancialEvents.Processor.Utils.ProcessingUtils as pu
import src.Core.FinancialEvents.Schemas.CommonFormats as cf
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf


class StockLotProcessor(
    lp.LotProcessor[
        sgf.GenericTaxLotEventStaging, pgf.TradeTaxLotEventStock, Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold]
    ]
):

    def process(
        self,
        input: sgf.GenericTaxLotEventStaging,
        references: Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold],
    ) -> pgf.TradeTaxLotEventStock:
        # print("Processing stock lot (ID: {})".format(lot.ID))

        allBuys: list[pgf.TradeEventStockAcquired] = list(filter(lambda trade: isinstance(trade, pgf.TradeEventStockAcquired), references))  # type: ignore
        allSells: list[pgf.TradeEventStockSold] = list(filter(lambda trade: isinstance(trade, pgf.TradeEventStockAcquired), references))  # type: ignore

        # TODO: Validate returns since buys and sells are merged
        # TODO: What to do when no match is found?
        try:
            matchingBuyById = self.utils.findStockEventById(input.Acquired.ID or "", allBuys)
            matchingSoldByDate = self.utils.findStockEventByDate(input.Sold.DateTime or ar.get("1-0-0"), allSells)[0]

            # print("Matched Buy with trade (ID: {}, DateTime: {})".format(matchingBuyById.ID, matchingBuyById.Date))
            # print("Matched Sell with trade (ID: {}, DateTime: {})".format(matchingSoldByDate.ID, matchingSoldByDate.Date))
        except StopIteration:
            print("Failed processing stock lot (ID: {}, ISIN: {}), found no match".format(input.ID, input.ISIN))
            raise StopIteration

        processed = pgf.TradeTaxLotEventStock(
            ID=input.ID,
            ISIN=input.ISIN,
            Quantity=input.Quantity,
            Acquired=matchingBuyById,
            Sold=matchingSoldByDate,
            ShortLongType=cf.GenericShortLong.LONG,
        )

        return processed
