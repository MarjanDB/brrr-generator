from dataclasses import dataclass

from arrow import Arrow

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent


@dataclass
class LotAcquired:
    Date: Arrow
    Relation: GenericTradeEvent


@dataclass
class LotSold:
    Date: Arrow
    Relation: GenericTradeEvent


@dataclass
class Lot:
    Quantity: float
    Acquired: LotAcquired
    Sold: LotSold
