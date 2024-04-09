from dataclasses import dataclass

from arrow import Arrow


@dataclass
class TaxAuthorityConfiguration:
    fromDate: Arrow
    toDate: Arrow
