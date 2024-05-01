from dataclasses import dataclass

from arrow import Arrow

from src.Core.FinancialEvents.Schemas.CommonFormats import GenericShortLong


@dataclass
class StagingTaxLotMatchingDetails:
    ID: str | None
    DateTime: Arrow | None


@dataclass
class StagingTaxLot:
    ID: str
    ISIN: str
    Ticker: str | None
    Quantity: float
    Acquired: StagingTaxLotMatchingDetails
    Sold: StagingTaxLotMatchingDetails
    ShortLongType: GenericShortLong  # Some trades can be SHORTING, meaning you first sell and then buy back
