from dataclasses import dataclass
from typing import Sequence

from Core.FinancialEvents.Schemas.Grouping import FinancialGrouping
from Core.FinancialEvents.Schemas.IdentifierRelationship import IdentifierRelationship


@dataclass
class FinancialEvents:
    """Canonical core container: groupings plus identifier relationships.

    Pipeline and ApplyIdentifierRelationshipsService work with this type.
    """

    Groupings: Sequence[FinancialGrouping]
    IdentifierRelationships: Sequence[IdentifierRelationship]
