from typing import Self

from Core.StagingFinancialEvents.Schemas.FinancialIdentifier import (
    StagingFinancialIdentifier,
)


class FinancialIdentifier:
    def __init__(self, ISIN: str | None = None, Ticker: str | None = None, Name: str | None = None):
        self._Isin = ISIN
        self._Ticker = Ticker
        self._Name = Name
        if self._Isin is None and self._Ticker is None and self._Name is None:
            raise ValueError("At least one of ISIN, Ticker, or Name must be provided")

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
        sameIsin = self._Isin is not None and self._Isin == other._Isin
        sameTicker = self._Ticker is not None and self._Ticker == other._Ticker
        sameName = self._Name is not None and self._Name == other._Name

        return sameIsin or sameTicker or sameName

    @staticmethod
    def fromStagingIdentifier(identifier: StagingFinancialIdentifier) -> "FinancialIdentifier":
        return FinancialIdentifier(ISIN=identifier.getIsin(), Ticker=identifier.getTicker(), Name=identifier.getName())
