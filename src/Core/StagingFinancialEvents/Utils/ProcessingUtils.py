from typing import Sequence, TypeVar

import arrow as ar

import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf

GENERIC_TRADE_EVENT = TypeVar("GENERIC_TRADE_EVENT", bound=pgf.GenericTradeEvent)


class ProcessingUtils:
    def findStockEventById(self, id: str, allStocks: Sequence[GENERIC_TRADE_EVENT]) -> GENERIC_TRADE_EVENT:
        filtered = filter(lambda trade: trade.ID == id, allStocks)
        return next(filtered)

    def findStockEventByDate(self, date: ar.Arrow, allStocks: Sequence[GENERIC_TRADE_EVENT]) -> Sequence[GENERIC_TRADE_EVENT]:
        filtered = filter(lambda trade: trade.Date == date, allStocks)
        return list(filtered)
