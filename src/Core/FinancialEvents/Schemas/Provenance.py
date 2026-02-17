from dataclasses import dataclass

from arrow import Arrow

from Core.FinancialEvents.Schemas.CommonFormats import GenericMonetaryExchangeInformation
from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier
from Core.FinancialEvents.Schemas.IdentifierRelationship import IdentifierChangeType


@dataclass
class ProvenanceStep:
    """
    Base type for one step in the provenance chain for a grouping, event, or lot.

    Always encodes which identifier relationship was applied (from/to, change
    type, effective date). Specialised subclasses carry additional context for
    particular change types (e.g. SPLIT vs RENAME).
    """

    FromIdentifier: FinancialIdentifier
    ToIdentifier: FinancialIdentifier
    ChangeType: IdentifierChangeType
    EffectiveDate: Arrow


@dataclass
class RenameProvenanceStep(ProvenanceStep):
    """Provenance step for a pure identifier rename (no quantity/price change)."""


@dataclass
class SplitProvenanceStep(ProvenanceStep):
    """
    Provenance step for SPLIT / REVERSE_SPLIT, with quantity/price context.

    Can be used both at grouping level (instrument-level quantities) and at
    event/lot level (per-item before-state).
    """

    # Corporate-action quantity context (for SPLIT / REVERSE_SPLIT on the instrument itself).
    QuantityBefore: float | None = None
    QuantityAfter: float | None = None

    # Per-item (event / lot) state before this step, when applicable.
    BeforeQuantity: float | None = None
    BeforeTradePrice: float | None = None
    BeforeExchangedMoney: GenericMonetaryExchangeInformation | None = None

