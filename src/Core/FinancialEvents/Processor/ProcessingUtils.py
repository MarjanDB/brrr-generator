from typing import Sequence

import arrow as ar

import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf


class ProcessingUtils:
    def findStockEventById(self, id: str, allStocks: Sequence[pgf.GenericTradeEvent]) -> pgf.GenericTradeEvent:
        filtered = filter(lambda trade: trade.ID == id, allStocks)
        return next(filtered)

    def findStockEventByDate(self, date: ar.Arrow, allStocks: Sequence[pgf.GenericTradeEvent]) -> Sequence[pgf.GenericTradeEvent]:
        filtered = filter(lambda trade: trade.Date == date, allStocks)
        return list(filtered)
