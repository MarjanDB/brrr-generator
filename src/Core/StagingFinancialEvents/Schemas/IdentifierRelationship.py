from dataclasses import dataclass
from enum import Enum
from typing import Sequence

from arrow import Arrow

from Core.StagingFinancialEvents.Schemas.FinancialIdentifier import StagingFinancialIdentifier


class StagingIdentifierChangeType(Enum):
    """How a staging financial identifier was superseded by another.

    RENAME: Ticker/name change only; no quantity change.
    SPLIT: 1 share becomes 2 or more under the new identifier.
    REVERSE_SPLIT: 2 or more shares become 1 under the new identifier.
    """

    RENAME = "RENAME"
    SPLIT = "SPLIT"
    REVERSE_SPLIT = "REVERSE_SPLIT"


@dataclass
class StagingIdentifierRelationship:
    """Directed edge: FromIdentifier was superseded/changed to ToIdentifier (staging identifiers)."""

    FromIdentifier: StagingFinancialIdentifier
    ToIdentifier: StagingFinancialIdentifier
    ChangeType: StagingIdentifierChangeType
    """When the change took effect (e.g. corporate action date). Optional; some countries need it for reporting."""
    EffectiveDate: Arrow | None = None


@dataclass
class StagingIdentifierRelationships:
    """Container for directed, typed staging identifier relationships (e.g. ISIN change, split)."""

    Relationships: Sequence[StagingIdentifierRelationship]
