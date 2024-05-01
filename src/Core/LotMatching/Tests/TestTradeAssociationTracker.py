import pytest
from arrow import get

from Core.LotMatching.Schemas.Trade import Trade
from Core.LotMatching.Services.TradeAssociationTracker import (
    TradeAssociation,
    TradeAssociationTracker,
)

simpleBuyTrade = Trade(ID="ID", Quantity=1, Date=get("2023-01-01"))

simpleSoldTrade = Trade(ID="ID2", Quantity=-1, Date=get("2023-01-01"))


class TestTradeAssociationTracker:

    def testRetrievalOfTrackerForSimpleAcquiredTrade(self):
        tracker = TradeAssociationTracker()

        tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5)

        retrieved = tracker.getAcquiredTradeTracker(simpleBuyTrade)

        assert isinstance(retrieved, TradeAssociation), "Returned tracker should be one of TradeAssociation"
        assert retrieved.Quantity == 0.5, "The tracked quantity should match the quantity when tracked"

    def testRetrievalOfTrackerForSimpleSoldTrade(self):
        tracker = TradeAssociationTracker()

        tracker.trackSoldQuantity(simpleSoldTrade, 0.5)

        retrieved = tracker.getSoldTradeTracker(simpleSoldTrade)

        assert isinstance(retrieved, TradeAssociation), "Returned tracker should be one of TradeAssociation"
        assert retrieved.Quantity == 0.5, "The tracked quantity should match the quantity when tracked"

    def testSummationOfQuantityForAcquiredTrade(self):
        tracker = TradeAssociationTracker()

        tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5)
        tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5)

        retrieved = tracker.getAcquiredTradeTracker(simpleBuyTrade)

        assert retrieved.Quantity == 1, "The tracked quantity should be the sum of all tracking quantities"

    def testSummationOfQuantityForSoldTrade(self):
        tracker = TradeAssociationTracker()

        tracker.trackSoldQuantity(simpleSoldTrade, 0.5)
        tracker.trackSoldQuantity(simpleSoldTrade, 0.5)

        retrieved = tracker.getSoldTradeTracker(simpleSoldTrade)

        assert retrieved.Quantity == 1, "The tracked quantity should be the sum of all tracking quantities"

    def testInvalidQuantityForAcquiredTrade(self):
        tracker = TradeAssociationTracker()

        with pytest.raises(AssertionError) as ae:
            tracker.trackAcquiredQuantity(simpleBuyTrade, 2)

    def testInvalidQuantityForSoldTrade(self):
        tracker = TradeAssociationTracker()

        with pytest.raises(AssertionError) as ae:
            tracker.trackSoldQuantity(simpleSoldTrade, 2)
