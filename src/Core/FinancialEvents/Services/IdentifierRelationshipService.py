from typing import Sequence

import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Schemas.IdentifierRelationship import IdentifierRelationships


class IdentifierRelationshipService:
    """
    Broker-agnostic step: computes directed, typed relationships between financial
    identifiers (e.g. ISIN change, rename, split). Future: populate from config/lookup
    or corporate-action parsing.
    """

    def compute(
        self, groupings: Sequence[pgf.FinancialGrouping]
    ) -> tuple[Sequence[pgf.FinancialGrouping], IdentifierRelationships]:
        """Return groupings unchanged and relationship set (empty for now)."""
        return (groupings, IdentifierRelationships(relationships=[]))
