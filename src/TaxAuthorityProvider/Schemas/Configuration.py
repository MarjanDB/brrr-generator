from dataclasses import dataclass
from enum import Enum

from arrow import Arrow


class TaxAuthorityLotMatchingMethod(Enum):
    NONE = "NONE"
    PROVIDED = "PROVIDED"
    FIFO = "FIFO"


@dataclass
class TaxAuthorityConfiguration:
    fromDate: Arrow
    toDate: Arrow
    lotMatchingMethod: TaxAuthorityLotMatchingMethod
