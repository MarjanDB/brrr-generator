from dataclasses import dataclass
from typing import Sequence

from Core.FinancialEvents.Schemas.CommonFormats import GenericCategory
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventDerivative,
    StagingTradeEventStock,
    StagingTransactionCash,
)
from Core.StagingFinancialEvents.Schemas.Lots import StagingTaxLot


@dataclass
class StagingFinancialGrouping:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: GenericCategory

    StockTrades: Sequence[StagingTradeEventStock]
    StockTaxLots: Sequence[StagingTaxLot]

    DerivativeTrades: Sequence[StagingTradeEventDerivative]
    DerivativeTaxLots: Sequence[StagingTaxLot]

    CashTransactions: Sequence[StagingTransactionCash]
