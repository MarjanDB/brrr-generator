from dataclasses import dataclass
from enum import Enum
from typing import Sequence, Union

from arrow import Arrow

from Core.StagingFinancialEvents.Schemas.FinancialIdentifier import (
    StagingFinancialIdentifier,
)


class StagingIdentifierChangeType(Enum):
    """How a staging financial identifier was superseded by another.

    RENAME: Ticker/name change only; no quantity change.
    SPLIT: 1 share becomes 2 or more under the new identifier.
    REVERSE_SPLIT: 2 or more shares become 1 under the new identifier.
    """

    RENAME = "RENAME"
    SPLIT = "SPLIT"
    REVERSE_SPLIT = "REVERSE_SPLIT"

    UNKNOWN = "UNKNOWN"


@dataclass
class StagingIdentifierRelationship:
    """Directed edge: FromIdentifier was superseded/changed to ToIdentifier (staging identifiers; e.g. RENAME)."""

    FromIdentifier: StagingFinancialIdentifier
    ToIdentifier: StagingFinancialIdentifier
    ChangeType: StagingIdentifierChangeType
    """When the change took effect (e.g. corporate action date). Optional; some countries need it for reporting."""
    EffectiveDate: Arrow | None = None


@dataclass
class StagingIdentifierRelationshipSplit:
    """SPLIT or REVERSE_SPLIT: same shape as base plus required quantity context for scaling (standalone to avoid dataclass default ordering)."""

    FromIdentifier: StagingFinancialIdentifier
    ToIdentifier: StagingFinancialIdentifier
    ChangeType: StagingIdentifierChangeType
    EffectiveDate: Arrow | None
    QuantityBefore: float
    QuantityAfter: float


@dataclass
class StagingIdentifierRelationshipPartial:
    """
    One side of an identifier relationship, with a correlation key so it can be merged
    with another partial (from another row or file) into a full StagingIdentifierRelationship.
    Exactly one of FromIdentifier or ToIdentifier is set.
    """

    FromIdentifier: StagingFinancialIdentifier | None
    ToIdentifier: StagingFinancialIdentifier | None
    CorrelationKey: str
    ChangeType: StagingIdentifierChangeType
    EffectiveDate: Arrow
    """Absolute quantity for this side (from-side = before, to-side = after). Used for SPLIT/REVERSE_SPLIT."""
    Quantity: float | None = None


@dataclass
class StagingIdentifierRelationshipPartialWithQuantity:
    """Partial that carries a required quantity for this side (used when merging into StagingIdentifierRelationshipSplit).
    Standalone dataclass to avoid overriding base Partial's Quantity type (float | None) with float.
    """

    FromIdentifier: StagingFinancialIdentifier | None
    ToIdentifier: StagingFinancialIdentifier | None
    CorrelationKey: str
    ChangeType: StagingIdentifierChangeType
    EffectiveDate: Arrow
    Quantity: float


StagingIdentifierRelationshipPartialAny = Union[
    StagingIdentifierRelationshipPartial,
    StagingIdentifierRelationshipPartialWithQuantity,
]
StagingIdentifierRelationshipAny = Union[StagingIdentifierRelationship, StagingIdentifierRelationshipSplit]


@dataclass
class StagingIdentifierRelationships:
    """Container for full and partial staging identifier relationships.

    Full Relationships are ready to use; PartialRelationships can be merged (by CorrelationKey)
    into full relationships in a later, broker-agnostic step (e.g. after combining multiple files).
    """

    Relationships: Sequence[StagingIdentifierRelationshipAny]
    PartialRelationships: Sequence[StagingIdentifierRelationshipPartialAny]
