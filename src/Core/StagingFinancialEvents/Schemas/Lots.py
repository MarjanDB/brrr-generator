from dataclasses import dataclass

from arrow import Arrow

from Core.FinancialEvents.Schemas.CommonFormats import GenericShortLong
from Core.StagingFinancialEvents.Schemas.FinancialIdentifier import (
    StagingFinancialIdentifier,
)


@dataclass
class StagingTaxLotMatchingDetails:
    ID: str | None
    DateTime: Arrow | None


@dataclass
class StagingTaxLot:
    ID: str
    FinancialIdentifier: StagingFinancialIdentifier
    Quantity: float
    Acquired: StagingTaxLotMatchingDetails
    Sold: StagingTaxLotMatchingDetails
    ShortLongType: GenericShortLong  # Some trades can be SHORTING, meaning you first sell and then buy back
