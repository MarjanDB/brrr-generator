"""
Broker-agnostic resolution of partial identifier relationships into full relationships.
Groups partials by CorrelationKey and builds one full relationship per key when both
from- and to-side partials are present (e.g. after merging multiple files or transform output).
"""

from __future__ import annotations

from itertools import groupby
from typing import Sequence

from Core.StagingFinancialEvents.Schemas.IdentifierRelationship import (
    StagingIdentifierChangeType,
    StagingIdentifierRelationship,
    StagingIdentifierRelationshipAny,
    StagingIdentifierRelationshipPartial,
    StagingIdentifierRelationshipPartialAny,
    StagingIdentifierRelationshipPartialWithQuantity,
    StagingIdentifierRelationshipSplit,
    StagingIdentifierRelationships,
)
from Core.StagingFinancialEvents.Schemas.StagingFinancialEvents import (
    StagingFinancialEvents,
)


class IdentifierRelationshipResolution:
    def mergePartialIdentifierRelationships(
        self,
        partials: Sequence[StagingIdentifierRelationshipPartialAny],
    ) -> Sequence[StagingIdentifierRelationshipAny]:
        """
        Group PartialRelationships by CorrelationKey; for each key with exactly one from-partial
        and one to-partial, build one full StagingIdentifierRelationship. Existing full
        Relationships are preserved; merged full relationships are appended.
        """
        partials = list(partials)
        if not partials:
            return []

        def key_fn(p: StagingIdentifierRelationshipPartialAny) -> str:
            return p.CorrelationKey

        sorted_partials = sorted(partials, key=key_fn)
        grouped = groupby(sorted_partials, key=key_fn)
        merged: list[StagingIdentifierRelationshipAny] = []
        for _key, group in grouped:
            rows = list(group)
            from_partial = next((r for r in rows if r.FromIdentifier is not None and r.ToIdentifier is None), None)
            to_partial = next((r for r in rows if r.ToIdentifier is not None and r.FromIdentifier is None), None)
            if from_partial is None or to_partial is None or from_partial.FromIdentifier is None or to_partial.ToIdentifier is None:
                continue
            change_type = from_partial.ChangeType or to_partial.ChangeType or StagingIdentifierChangeType.RENAME
            effective_date = from_partial.EffectiveDate or to_partial.EffectiveDate

            if isinstance(from_partial, StagingIdentifierRelationshipPartialWithQuantity) and isinstance(
                to_partial, StagingIdentifierRelationshipPartialWithQuantity
            ):
                quantity_before = abs(from_partial.Quantity)
                quantity_after = abs(to_partial.Quantity)
                if quantity_after < quantity_before:
                    change_type = StagingIdentifierChangeType.REVERSE_SPLIT
                merged.append(
                    StagingIdentifierRelationshipSplit(
                        FromIdentifier=from_partial.FromIdentifier,
                        ToIdentifier=to_partial.ToIdentifier,
                        ChangeType=change_type,
                        EffectiveDate=effective_date,
                        QuantityBefore=quantity_before,
                        QuantityAfter=quantity_after,
                    )
                )
            else:
                merged.append(
                    StagingIdentifierRelationship(
                        FromIdentifier=from_partial.FromIdentifier,
                        ToIdentifier=to_partial.ToIdentifier,
                        ChangeType=change_type,
                        EffectiveDate=effective_date,
                    )
                )
        return merged

    def resolveStagingFinancialEventsPartialRelationships(
        self,
        events: StagingFinancialEvents,
    ) -> StagingFinancialEvents:
        """Resolve partial relationships in StagingFinancialEvents into full relationships (returns new instance)."""
        merged = self.mergePartialIdentifierRelationships(events.IdentifierRelationships.PartialRelationships)
        all_relationships = list(events.IdentifierRelationships.Relationships) + list(merged)

        return StagingFinancialEvents(
            Groupings=events.Groupings,
            IdentifierRelationships=StagingIdentifierRelationships(
                Relationships=all_relationships,
                PartialRelationships=events.IdentifierRelationships.PartialRelationships,
            ),
        )
