import arrow as ar

from Core.StagingFinancialEvents.Schemas.FinancialIdentifier import (
    StagingFinancialIdentifier,
)
from Core.StagingFinancialEvents.Schemas.IdentifierRelationship import (
    StagingIdentifierChangeType,
    StagingIdentifierRelationship,
    StagingIdentifierRelationshipPartial,
    StagingIdentifierRelationshipPartialWithQuantity,
    StagingIdentifierRelationshipSplit,
    StagingIdentifierRelationships,
)
from Core.StagingFinancialEvents.Schemas.StagingFinancialEvents import StagingFinancialEvents
from Core.StagingFinancialEvents.Services.IdentifierRelationshipResolution import (
    IdentifierRelationshipResolution,
)


class TestMergePartialIdentifierRelationships:
    def test_two_partials_same_key_produce_one_full_relationship(self):
        from_id = StagingFinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old Inc")
        to_id = StagingFinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New Inc")
        partials = [
            StagingIdentifierRelationshipPartial(
                FromIdentifier=from_id,
                ToIdentifier=None,
                CorrelationKey="action-1",
                ChangeType=StagingIdentifierChangeType.SPLIT,
                EffectiveDate=ar.get("2024-10-01"),
            ),
            StagingIdentifierRelationshipPartial(
                FromIdentifier=None,
                ToIdentifier=to_id,
                CorrelationKey="action-1",
                ChangeType=StagingIdentifierChangeType.SPLIT,
                EffectiveDate=ar.get("2024-10-01"),
            ),
        ]
        result = IdentifierRelationshipResolution().mergePartialIdentifierRelationships(partials)
        assert len(result) == 1
        r = result[0]
        assert r.FromIdentifier.getIsin() == "US111"
        assert r.ToIdentifier.getIsin() == "US222"
        assert r.ChangeType == StagingIdentifierChangeType.SPLIT
        assert r.EffectiveDate is not None

    def test_partials_with_quantity_produce_full_with_quantity_before_after(self):
        """PartialWithQuantity on both sides produces StagingIdentifierRelationshipSplit with QuantityBefore/QuantityAfter."""
        from_id = StagingFinancialIdentifier(ISIN="US86800U1043", Ticker="SMCI.OLD", Name="Old")
        to_id = StagingFinancialIdentifier(ISIN="US86800U3023", Ticker="SMCI", Name="New")
        partials = [
            StagingIdentifierRelationshipPartialWithQuantity(
                FromIdentifier=from_id,
                ToIdentifier=None,
                CorrelationKey="action-1",
                ChangeType=StagingIdentifierChangeType.SPLIT,
                EffectiveDate=ar.get("2024-09-30"),
                Quantity=4.0,
            ),
            StagingIdentifierRelationshipPartialWithQuantity(
                FromIdentifier=None,
                ToIdentifier=to_id,
                CorrelationKey="action-1",
                ChangeType=StagingIdentifierChangeType.SPLIT,
                EffectiveDate=ar.get("2024-09-30"),
                Quantity=40.0,
            ),
        ]
        result = IdentifierRelationshipResolution().mergePartialIdentifierRelationships(partials)
        assert len(result) == 1
        r = result[0]
        assert isinstance(r, StagingIdentifierRelationshipSplit)
        assert r.QuantityBefore == 4.0
        assert r.QuantityAfter == 40.0
        assert r.ChangeType == StagingIdentifierChangeType.SPLIT

    def test_reverse_split_inferred_when_quantity_after_less_than_before(self):
        """When both are PartialWithQuantity and to.Quantity < from.Quantity, ChangeType becomes REVERSE_SPLIT."""
        from_id = StagingFinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old")
        to_id = StagingFinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New")
        partials = [
            StagingIdentifierRelationshipPartialWithQuantity(
                FromIdentifier=from_id,
                ToIdentifier=None,
                CorrelationKey="rev-1",
                ChangeType=StagingIdentifierChangeType.SPLIT,
                EffectiveDate=ar.get("2024-10-01"),
                Quantity=10.0,
            ),
            StagingIdentifierRelationshipPartialWithQuantity(
                FromIdentifier=None,
                ToIdentifier=to_id,
                CorrelationKey="rev-1",
                ChangeType=StagingIdentifierChangeType.SPLIT,
                EffectiveDate=ar.get("2024-10-01"),
                Quantity=1.0,
            ),
        ]
        result = IdentifierRelationshipResolution().mergePartialIdentifierRelationships(partials)
        assert len(result) == 1
        r = result[0]
        assert isinstance(r, StagingIdentifierRelationshipSplit)
        assert r.ChangeType == StagingIdentifierChangeType.REVERSE_SPLIT
        assert r.QuantityBefore == 10.0
        assert r.QuantityAfter == 1.0

    def test_only_from_partial_produces_no_full_relationship(self):
        from_id = StagingFinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old")
        partials = [
            StagingIdentifierRelationshipPartial(
                FromIdentifier=from_id,
                ToIdentifier=None,
                CorrelationKey="action-1",
                ChangeType=None,
                EffectiveDate=None,
            ),
        ]
        result = IdentifierRelationshipResolution().mergePartialIdentifierRelationships(partials)
        assert len(result) == 0

    def test_empty_partials_returns_empty(self):
        result = IdentifierRelationshipResolution().mergePartialIdentifierRelationships([])
        assert result == []


class TestResolveStagingFinancialEventsPartialRelationships:
    def test_preserves_existing_full_relationships(self):
        from_id = StagingFinancialIdentifier(ISIN="US111", Ticker="A", Name="A")
        to_id = StagingFinancialIdentifier(ISIN="US222", Ticker="B", Name="B")
        existing = StagingIdentifierRelationship(
            FromIdentifier=from_id,
            ToIdentifier=to_id,
            ChangeType=StagingIdentifierChangeType.RENAME,
            EffectiveDate=None,
        )
        events = StagingFinancialEvents(
            Groupings=(),
            IdentifierRelationships=StagingIdentifierRelationships(
                Relationships=(existing,),
                PartialRelationships=(),
            ),
        )
        result = IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(events)
        assert len(result.IdentifierRelationships.Relationships) == 1
        assert result.IdentifierRelationships.Relationships[0].FromIdentifier.getIsin() == "US111"
        assert len(result.IdentifierRelationships.PartialRelationships) == 0
