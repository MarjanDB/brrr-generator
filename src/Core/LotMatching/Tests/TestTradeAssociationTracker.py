import pytest
from arrow import get

from src.Core.FinancialEvents.Schemas.CommonFormats import (
    GenericAssetClass,
    GenericMonetaryExchangeInformation,
)
from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Services.TradeAssociationTracker import (
    TradeAssociation,
    TradeAssociationTracker,
)

simpleBuyTrade = GenericTradeEvent(
    ID="ID",
    ISIN="ISIN",
    Ticker="TICKER",
    AssetClass=GenericAssetClass.STOCK,
    Date=get("2023-01-01"),
    Multiplier=1,
    ExchangedMoney=GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1,
        UnderlyingTradePrice=1,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
    ),
)

simpleSoldTrade = GenericTradeEvent(
    ID="ID",
    ISIN="ISIN",
    Ticker="TICKER",
    AssetClass=GenericAssetClass.STOCK,
    Date=get("2023-01-01"),
    Multiplier=1,
    ExchangedMoney=GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=-1,
        UnderlyingTradePrice=1,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
    ),
)


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

        retrieved = tracker.getSoldTradeTracker(simpleBuyTrade)

        assert retrieved.Quantity == 1, "The tracked quantity should be the sum of all tracking quantities"

    def testInvalidQuantityForAcquiredTrade(self):
        tracker = TradeAssociationTracker()

        with pytest.raises(AssertionError) as ae:
            tracker.trackAcquiredQuantity(simpleBuyTrade, 2)

    def testInvalidQuantityForSoldTrade(self):
        tracker = TradeAssociationTracker()

        with pytest.raises(AssertionError) as ae:
            tracker.trackSoldQuantity(simpleSoldTrade, 2)
