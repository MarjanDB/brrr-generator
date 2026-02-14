from dataclasses import dataclass
from enum import Enum
from typing import Sequence

from arrow import Arrow

from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier


class IdentifierChangeType(Enum):
    """How a financial identifier was superseded by another.

    RENAME: Ticker/name change only; no quantity change.
    SPLIT: 1 share becomes 2 or more under the new identifier.
    REVERSE_SPLIT: 2 or more shares become 1 under the new identifier.
    """

    RENAME = "RENAME"
    SPLIT = "SPLIT"
    REVERSE_SPLIT = "REVERSE_SPLIT"


@dataclass
class IdentifierRelationship:
    """Directed edge: FromIdentifier was superseded/changed to ToIdentifier."""

    FromIdentifier: FinancialIdentifier
    ToIdentifier: FinancialIdentifier
    ChangeType: IdentifierChangeType
    """When the change took effect (e.g. corporate action date). Optional; some countries need it for reporting."""
    EffectiveDate: Arrow


@dataclass
class IdentifierRelationships:
    """Container for directed, typed identifier relationships (e.g. ISIN change, split).

    Enables later helpers such as resolving the proper identifier by following the chain.
    """

    Relationships: Sequence[IdentifierRelationship]
