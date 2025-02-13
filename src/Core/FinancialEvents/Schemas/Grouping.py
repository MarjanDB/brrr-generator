from dataclasses import dataclass
from typing import Self, Sequence

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.StagingFinancialEvents.Schemas.Grouping as sfg
from Core.FinancialEvents.Schemas.Events import (
    TradeEventDerivativeAcquired,
    TradeEventDerivativeSold,
    TradeEventStockAcquired,
    TradeEventStockSold,
    TransactionCash,
)
from Core.FinancialEvents.Schemas.Lots import TaxLotDerivative, TaxLotStock


class FinancialGroupingIdentifier:
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

    @staticmethod
    def fromStagingIdentifier(identifier: sfg.StagingFinancialGroupingIdentifier) -> "FinancialGroupingIdentifier":
        return FinancialGroupingIdentifier(ISIN=identifier.getIsin(), Ticker=identifier.getTicker(), Name=identifier.getName())


@dataclass
class FinancialGrouping:
    GroupingIdentity: FinancialGroupingIdentifier
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: cf.GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]
    StockTaxLots: Sequence[TaxLotStock]

    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]
    DerivativeTaxLots: Sequence[TaxLotDerivative]

    CashTransactions: Sequence[TransactionCash]


@dataclass
class UnderlyingGroupingWithTradesOfInterest:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: cf.GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]

    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]

    CashTransactions: Sequence[TransactionCash]
