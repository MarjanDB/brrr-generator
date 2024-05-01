from dataclasses import dataclass

from arrow import Arrow

from Core.LotMatching.Schemas.Trade import Trade


@dataclass
class LotAcquired:
    Date: Arrow
    Relation: Trade


@dataclass
class LotSold:
    Date: Arrow
    Relation: Trade


@dataclass
class Lot:
    Quantity: float
    Acquired: LotAcquired
    Sold: LotSold
