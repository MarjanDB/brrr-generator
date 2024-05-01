from dataclasses import dataclass
from typing import Sequence

from src.Core.FinancialEvents.Schemas.CommonFormats import GenericCategory
from src.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventDerivative,
    StagingTradeEventStock,
    StagingTransactionCash,
)
from src.StagingFinancialEvents.Schemas.Lots import StagingTaxLot


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
