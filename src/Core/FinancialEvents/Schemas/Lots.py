from dataclasses import dataclass, field
from typing import Generic, Sequence, TypeVar

from Core.FinancialEvents.Schemas.CommonFormats import GenericShortLong
from Core.FinancialEvents.Schemas.Events import (
    TradeEvent,
    TradeEventDerivativeAcquired,
    TradeEventDerivativeSold,
    TradeEventStockAcquired,
    TradeEventStockSold,
)
from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier
from Core.FinancialEvents.Schemas.Provenance import ProvenanceStep

TaxLotAcquiredEvent = TypeVar("TaxLotAcquiredEvent", bound=TradeEvent, covariant=True)
TaxLotSoldEvent = TypeVar("TaxLotSoldEvent", bound=TradeEvent, covariant=True)


@dataclass
class TaxLot(Generic[TaxLotAcquiredEvent, TaxLotSoldEvent]):
    ID: str
    FinancialIdentifier: FinancialIdentifier
    Quantity: float
    Acquired: TaxLotAcquiredEvent
    Sold: TaxLotSoldEvent
    ShortLongType: GenericShortLong  # Some trades can be SHORTING, meaning you first sell and then buy back
    Provenance: Sequence[ProvenanceStep] = field(default_factory=list)


@dataclass
class TaxLotStock(TaxLot[TradeEventStockAcquired, TradeEventStockSold]): ...


@dataclass
class TaxLotDerivative(TaxLot[TradeEventDerivativeAcquired, TradeEventDerivativeSold]): ...
