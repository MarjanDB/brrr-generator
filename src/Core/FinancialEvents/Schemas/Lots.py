from dataclasses import dataclass
from typing import Generic, TypeVar

from Core.FinancialEvents.Schemas.CommonFormats import GenericShortLong
from Core.FinancialEvents.Schemas.Events import (
    TradeEvent,
    TradeEventDerivativeAcquired,
    TradeEventDerivativeSold,
    TradeEventStockAcquired,
    TradeEventStockSold,
)

TaxLotAcquiredEvent = TypeVar("TaxLotAcquiredEvent", bound=TradeEvent, covariant=True)
TaxLotSoldEvent = TypeVar("TaxLotSoldEvent", bound=TradeEvent, covariant=True)


@dataclass
class TaxLot(Generic[TaxLotAcquiredEvent, TaxLotSoldEvent]):
    ID: str
    ISIN: str
    Quantity: float
    Acquired: TaxLotAcquiredEvent
    Sold: TaxLotSoldEvent
    ShortLongType: GenericShortLong  # Some trades can be SHORTING, meaning you first sell and then buy back


@dataclass
class TaxLotStock(TaxLot[TradeEventStockAcquired, TradeEventStockSold]): ...


@dataclass
class TaxLotDerivative(TaxLot[TradeEventDerivativeAcquired, TradeEventDerivativeSold]): ...
