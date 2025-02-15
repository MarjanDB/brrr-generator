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

    def isTheSameAs(self, other: "FinancialIdentifier") -> bool:
        hasIsin = self._Isin is not None and other._Isin is not None
        hasTicker = self._Ticker is not None and other._Ticker is not None
        hasName = self._Name is not None and other._Name is not None

        sameIsin = hasIsin and self._Isin == other._Isin
        sameTicker = hasTicker and self._Ticker == other._Ticker
        sameName = hasName and self._Name == other._Name

        # While ISIN and the Ticker are enough for identifying a company ticker,
        # it is not enough to identify a specific traded instrument (options with different strike prices / expiration dates)
        # TODO: Should probably rething the FinancialIdentifier class
        isinEquality = sameIsin and not hasTicker and not hasName
        tickerEquality = sameIsin and sameTicker and not hasName
        nameEquality = sameIsin and sameTicker and sameName

        return isinEquality or tickerEquality or nameEquality

    @staticmethod
    def fromStagingIdentifier(identifier: StagingFinancialIdentifier) -> "FinancialIdentifier":
        return FinancialIdentifier(ISIN=identifier.getIsin(), Ticker=identifier.getTicker(), Name=identifier.getName())

    def __str__(self) -> str:
        return "FinancialIdentifier(ISIN: {}, Ticker: {}, Name: {})".format(self._Isin, self._Ticker, self._Name)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, FinancialIdentifier):
            return self.isTheSameAs(other)
        return False

    def __hash__(self) -> int:
        return hash((self._Isin, self._Ticker, self._Name))

    def __lt__(self, other: Self) -> bool:

        self_values = (self._Isin, self._Ticker, self._Name)
        other_values = (other._Isin, other._Ticker, other._Name)

        for self_val, other_val in zip(self_values, other_values):
            if self_val is not None and other_val is not None:
                return self_val < other_val

        return False

    def __le__(self, other: Self) -> bool:
        return self < other or self == other

    def __gt__(self, other: Self) -> bool:
        return not (self <= other)

    def __ge__(self, other: Self) -> bool:
        return not (self < other)
