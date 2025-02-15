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
from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier
from Core.FinancialEvents.Schemas.Lots import TaxLotDerivative, TaxLotStock


@dataclass
class DerivativeGrouping:
    FinancialIdentifier: FinancialIdentifier
    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]
    DerivativeTaxLots: Sequence[TaxLotDerivative]


@dataclass
class FinancialGrouping:
    FinancialIdentifier: FinancialIdentifier
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: cf.GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]
    StockTaxLots: Sequence[TaxLotStock]

    DerivativeGroupings: Sequence[DerivativeGrouping]

    CashTransactions: Sequence[TransactionCash]


@dataclass
class UnderlyingDerivativeGrouping:
    FinancialIdentifier: FinancialIdentifier
    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]


@dataclass
class UnderlyingGroupingWithTradesOfInterest:
    FinancialIdentifier: FinancialIdentifier
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: cf.GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]

    DerivativeGroupings: Sequence[UnderlyingDerivativeGrouping]

    CashTransactions: Sequence[TransactionCash]
