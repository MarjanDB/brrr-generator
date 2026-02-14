from typing import Self


class StagingFinancialIdentifier:
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

    def isTheSameAs(self, other: "StagingFinancialIdentifier") -> bool:
        hasIsin = self._Isin is not None and other._Isin is not None
        hasTicker = self._Ticker is not None and other._Ticker is not None
        hasName = self._Name is not None and other._Name is not None

        # Do not match when Name differs (one has name, other has different or missing).
        if (self._Name is None) != (other._Name is None) or (hasName and self._Name != other._Name):
            return False
        # Do not match when both have ISIN but they differ (e.g. ISIN change).
        if hasIsin and self._Isin != other._Isin:
            return False

        sameIsin = hasIsin and self._Isin == other._Isin
        sameTicker = hasTicker and self._Ticker == other._Ticker
        sameName = hasName and self._Name == other._Name

        # Core-style branches when ISIN is present.
        isinEquality = sameIsin and not hasTicker and not hasName
        tickerEquality = sameIsin and sameTicker and not hasName
        nameEquality = sameIsin and sameTicker and sameName
        # Staging: same ticker matches when no name conflict (e.g. no ISIN from broker yet).
        tickerOnlyEquality = sameTicker and (not hasName or sameName)

        return isinEquality or tickerEquality or nameEquality or tickerOnlyEquality

    def __str__(self) -> str:
        return "FinancialIdentifier(ISIN: {}, Ticker: {}, Name: {})".format(self._Isin, self._Ticker, self._Name)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, StagingFinancialIdentifier):
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
