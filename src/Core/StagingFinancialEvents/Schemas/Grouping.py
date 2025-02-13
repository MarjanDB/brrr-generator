from dataclasses import dataclass
from typing import Self, Sequence

from Core.FinancialEvents.Schemas.CommonFormats import GenericCategory
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventDerivative,
    StagingTradeEventStock,
    StagingTransactionCash,
)
from Core.StagingFinancialEvents.Schemas.Lots import StagingTaxLot


class StagingFinancialGroupingIdentifier:
    def __init__(self, ISIN: str | None = None, Ticker: str | None = None, Name: str | None = None):
        self._Isin = ISIN
        self._Ticker = Ticker
        self._Name = Name

    def setIsin(self, ISIN: str | None):
        self._Isin = ISIN

    def setTicker(self, Ticker: str | None):
        self._Ticker = Ticker

    def setName(self, Name: str | None):
        self._Name = Name

    def getIsin(self) -> str | None:
        return self._Isin

    def getTicker(self) -> str | None:
        return self._Ticker

    def getName(self) -> str | None:
        return self._Name

    def isTheSameAs(self, other: Self) -> bool:
        return self._Isin == other._Isin or self._Ticker == other._Ticker or self._Name == other._Name


@dataclass
class StagingFinancialGrouping:
    GroupingIdentity: StagingFinancialGroupingIdentifier
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: GenericCategory

    StockTrades: Sequence[StagingTradeEventStock]
    StockTaxLots: Sequence[StagingTaxLot]

    DerivativeTrades: Sequence[StagingTradeEventDerivative]
    DerivativeTaxLots: Sequence[StagingTaxLot]

    CashTransactions: Sequence[StagingTransactionCash]
