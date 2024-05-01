from typing import Sequence

import arrow as ar

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.StagingFinancialEvents.Contracts.LotProcessor import LotProcessor
from Core.StagingFinancialEvents.Schemas.Lots import StagingTaxLot


class StockLotProcessor(LotProcessor[StagingTaxLot, pgf.TaxLotStock, Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold]]):

    def process(
        self,
        input: StagingTaxLot,
        references: Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold],
    ) -> pgf.TaxLotStock:
        # print("Processing stock lot (ID: {})".format(lot.ID))

        allBuys: list[pgf.TradeEventStockAcquired] = list(filter(lambda trade: isinstance(trade, pgf.TradeEventStockAcquired), references))  # type: ignore
        allSells: list[pgf.TradeEventStockSold] = list(filter(lambda trade: isinstance(trade, pgf.TradeEventStockSold), references))  # type: ignore

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

        processed = pgf.TaxLotStock(
            ID=input.ID,
            ISIN=input.ISIN,
            Quantity=input.Quantity,
            Acquired=matchingBuyById,
            Sold=matchingSoldByDate,
            ShortLongType=cf.GenericShortLong.LONG,
        )

        return processed
