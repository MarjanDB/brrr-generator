from dataclasses import dataclass
from typing import Sequence

import Core.FinancialEvents.Schemas.CommonFormats as cf
from Core.FinancialEvents.Schemas.Events import (
    TradeEventDerivativeAcquired,
    TradeEventDerivativeSold,
    TradeEventStockAcquired,
    TradeEventStockSold,
    TransactionCash,
)
from Core.FinancialEvents.Schemas.Lots import TaxLotDerivative, TaxLotStock


@dataclass
class FinancialGrouping:
    ISIN: str
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
