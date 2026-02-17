from typing import cast

import arrow as ar

import BrokerageExportProviders.Brokerages.IBKR.Schemas.SegmentedTrades as st
import BrokerageExportProviders.Brokerages.IBKR.Tests.TestIbkrTransform as tf
import BrokerageExportProviders.Brokerages.IBKR.Transforms.Transform as ibkr_t
import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.FinancialEvents as pfe
import Core.FinancialEvents.Schemas.Grouping as pgf
import Core.FinancialEvents.Schemas.IdentifierRelationship as ir
from Core.FinancialEvents.Schemas.Events import (
    TradeEventStockAcquired,
    TradeEventStockSold,
)
from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier
from Core.FinancialEvents.Schemas.Lots import TaxLotStock
from Core.FinancialEvents.Services.ApplyIdentifierRelationshipsService import (
    ApplyIdentifierRelationshipsService,
)
from Core.StagingFinancialEvents.Schemas.IdentifierRelationship import (
    StagingIdentifierChangeType,
    StagingIdentifierRelationshipSplit,
)
from Core.StagingFinancialEvents.Services.IdentifierRelationshipResolution import (
    IdentifierRelationshipResolution,
)


def _makeGrouping(
    identifier: FinancialIdentifier,
    stockTrades: list,
    stockTaxLots: list | None = None,
) -> pgf.FinancialGrouping:
    return pgf.FinancialGrouping(
        FinancialIdentifier=identifier,
        CountryOfOrigin="US",
        UnderlyingCategory=cf.GenericCategory.REGULAR,
        StockTrades=stockTrades,
        StockTaxLots=stockTaxLots or [],
        DerivativeGroupings=[],
        CashTransactions=[],
    )


def _makeTrade(
    id: str,
    identifier: FinancialIdentifier,
    qty: float,
    date_str: str,
    underlying_trade_price: float = 10.0,
) -> TradeEventStockAcquired | TradeEventStockSold:
    money = cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="USD",
        UnderlyingQuantity=qty,
        UnderlyingTradePrice=underlying_trade_price,
        ComissionCurrency="USD",
        ComissionTotal=0.0,
        TaxCurrency="USD",
        TaxTotal=0.0,
        FxRateToBase=1.0,
    )
    if qty > 0:
        return TradeEventStockAcquired(
            ID=id,
            FinancialIdentifier=identifier,
            AssetClass=cf.GenericAssetClass.STOCK,
            Date=ar.get(date_str),
            Multiplier=1.0,
            AcquiredReason=cf.GenericTradeReportItemGainType.BOUGHT,
            ExchangedMoney=money,
        )
    return TradeEventStockSold(
        ID=id,
        FinancialIdentifier=identifier,
        AssetClass=cf.GenericAssetClass.STOCK,
        Date=ar.get(date_str),
        Multiplier=1.0,
        ExchangedMoney=money,
    )


class TestApplyIdentifierRelationshipsServiceRename:
    def test_two_groupings_with_rename_produce_one_merged_grouping(self) -> None:
        idA = FinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old Co")
        idB = FinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New Co")
        rel = ir.IdentifierRelationship(
            FromIdentifier=idA,
            ToIdentifier=idB,
            ChangeType=ir.IdentifierChangeType.RENAME,
            EffectiveDate=ar.get("2024-06-01"),
        )
        g1 = _makeGrouping(idA, [_makeTrade("t1", idA, 1.0, "2024-01-01")])
        g2 = _makeGrouping(idB, [_makeTrade("t2", idB, -1.0, "2024-02-01")])
        events = pfe.FinancialEvents(
            Groupings=[g1, g2],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.RENAME])
        assert len(result.Groupings) == 1
        merged = result.Groupings[0]
        assert merged.FinancialIdentifier.isTheSameAs(idB)
        assert len(merged.StockTrades) == 2
        assert all(t.FinancialIdentifier.isTheSameAs(idB) for t in merged.StockTrades)
        # Provenance: one rename step A -> B recorded on the grouping.
        assert len(merged.Provenance) == 1
        step = merged.Provenance[0]
        assert step.FromIdentifier.isTheSameAs(idA)
        assert step.ToIdentifier.isTheSameAs(idB)
        assert step.ChangeType == ir.IdentifierChangeType.RENAME

    def test_empty_relationships_leaves_groupings_unchanged(self) -> None:
        idA = FinancialIdentifier(ISIN="US111", Ticker="A", Name="A")
        g = _makeGrouping(idA, [])
        events = pfe.FinancialEvents(
            Groupings=[g],
            IdentifierRelationships=[],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.RENAME])
        assert len(result.Groupings) == 1
        assert result.Groupings[0].FinancialIdentifier.isTheSameAs(idA)

    def test_no_rename_in_change_types_leaves_unchanged(self) -> None:
        idA = FinancialIdentifier(ISIN="US111", Ticker="A", Name="A")
        idB = FinancialIdentifier(ISIN="US222", Ticker="B", Name="B")
        rel = ir.IdentifierRelationship(
            FromIdentifier=idA,
            ToIdentifier=idB,
            ChangeType=ir.IdentifierChangeType.RENAME,
            EffectiveDate=ar.get("2024-01-01"),
        )
        g1 = _makeGrouping(idA, [])
        events = pfe.FinancialEvents(
            Groupings=[g1],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[])  # no RENAME
        assert len(result.Groupings) == 1
        assert result.Groupings[0].FinancialIdentifier.isTheSameAs(idA)

    def test_chain_a_to_b_to_c_produces_one_grouping_with_c(self) -> None:
        idA = FinancialIdentifier(ISIN="US111", Ticker="A", Name="A")
        idB = FinancialIdentifier(ISIN="US222", Ticker="B", Name="B")
        idC = FinancialIdentifier(ISIN="US333", Ticker="C", Name="C")
        rel1 = ir.IdentifierRelationship(
            FromIdentifier=idA,
            ToIdentifier=idB,
            ChangeType=ir.IdentifierChangeType.RENAME,
            EffectiveDate=ar.get("2024-01-01"),
        )
        rel2 = ir.IdentifierRelationship(
            FromIdentifier=idB,
            ToIdentifier=idC,
            ChangeType=ir.IdentifierChangeType.RENAME,
            EffectiveDate=ar.get("2024-02-01"),
        )
        g1 = _makeGrouping(idA, [_makeTrade("t1", idA, 1.0, "2024-01-01")])
        g2 = _makeGrouping(idB, [_makeTrade("t2", idB, 1.0, "2024-02-01")])
        g3 = _makeGrouping(idC, [])
        events = pfe.FinancialEvents(
            Groupings=[g1, g2, g3],
            IdentifierRelationships=[rel1, rel2],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.RENAME])
        assert len(result.Groupings) == 1  # merged A+B+C under C (g3 at sink is merged in)
        merged = result.Groupings[0]
        assert merged.FinancialIdentifier.isTheSameAs(idC)
        assert len(merged.StockTrades) == 2
        # Provenance: rename chain A -> B -> C in order.
        assert len(merged.Provenance) == 2
        assert merged.Provenance[0].FromIdentifier.isTheSameAs(idA)
        assert merged.Provenance[0].ToIdentifier.isTheSameAs(idB)
        assert merged.Provenance[1].FromIdentifier.isTheSameAs(idB)
        assert merged.Provenance[1].ToIdentifier.isTheSameAs(idC)

    def test_sink_grouping_with_different_instance_merges_into_one(self) -> None:
        """Sink (RKLB) grouping must be merged with renamed (RKLB.old) even when the sink id is a different object."""
        idOld = FinancialIdentifier(ISIN="US7731221062", Ticker="RKLB.old", Name="RKLB old")
        idNewInRel = FinancialIdentifier(ISIN="US7731211089", Ticker="RKLB", Name="ROCKET LAB CORP")
        rel = ir.IdentifierRelationship(
            FromIdentifier=idOld,
            ToIdentifier=idNewInRel,
            ChangeType=ir.IdentifierChangeType.RENAME,
            EffectiveDate=ar.get("2024-06-01"),
        )
        gOld = _makeGrouping(idOld, [_makeTrade("t1", idOld, 10.0, "2024-01-01")])
        # Sink grouping uses a separate instance (e.g. from broker) – same instrument, different object.
        idNewInGrouping = FinancialIdentifier(ISIN="US7731211089", Ticker="RKLB", Name="ROCKET LAB CORP")
        gNew = _makeGrouping(idNewInGrouping, [_makeTrade("t2", idNewInGrouping, -5.0, "2024-07-01")])
        events = pfe.FinancialEvents(
            Groupings=[gOld, gNew],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.RENAME])
        assert len(result.Groupings) == 1, "sink grouping must be merged with renamed grouping"
        merged = result.Groupings[0]
        assert merged.FinancialIdentifier.isTheSameAs(idNewInRel)
        assert len(merged.StockTrades) == 2

    def test_same_isin_different_ticker_matches_rename_chain(self) -> None:
        """Grouping with same ISIN as relationship 'from' but different ticker (e.g. RKLB vs RKLB.OLD) still merges."""
        idOldInRel = FinancialIdentifier(ISIN="US7731221062", Ticker="RKLB.OLD", Name=None)
        idNew = FinancialIdentifier(ISIN="US7731211089", Ticker="RKLB", Name="ROCKET LAB CORP")
        rel = ir.IdentifierRelationship(
            FromIdentifier=idOldInRel,
            ToIdentifier=idNew,
            ChangeType=ir.IdentifierChangeType.RENAME,
            EffectiveDate=ar.get("2024-06-01"),
        )
        # Grouping has old ISIN but ticker RKLB (not RKLB.OLD) – isTheSameAs would be False; ISIN fallback should match.
        idInGrouping = FinancialIdentifier(ISIN="US7731221062", Ticker="RKLB", Name=None)
        g = _makeGrouping(idInGrouping, [_makeTrade("t1", idInGrouping, 5.0, "2024-01-01")])
        events = pfe.FinancialEvents(
            Groupings=[g],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.RENAME])
        assert len(result.Groupings) == 1
        assert result.Groupings[0].FinancialIdentifier.isTheSameAs(idNew)
        assert len(result.Groupings[0].StockTrades) == 1


class TestApplyIdentifierRelationshipsServiceSplit:
    def test_apply_split_scales_trades_before_effective_date_and_merges_into_to(self) -> None:
        """SPLIT: trades in From grouping with Date < EffectiveDate get quantity multiplied by ratio; merge into To."""
        idFrom = FinancialIdentifier(ISIN="US86800U1043", Ticker="SMCI.OLD", Name="Old")
        idTo = FinancialIdentifier(ISIN="US86800U3023", Ticker="SMCI", Name="New")
        rel = ir.IdentifierRelationshipSplit(
            FromIdentifier=idFrom,
            ToIdentifier=idTo,
            ChangeType=ir.IdentifierChangeType.SPLIT,
            EffectiveDate=ar.get("2024-10-01"),
            QuantityBefore=4.0,
            QuantityAfter=40.0,
        )
        gFrom = _makeGrouping(idFrom, [_makeTrade("t1", idFrom, 4.0, "2024-09-01")])
        events = pfe.FinancialEvents(
            Groupings=[gFrom],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.SPLIT])
        assert len(result.Groupings) == 1
        merged = result.Groupings[0]
        assert merged.FinancialIdentifier.isTheSameAs(idTo)
        assert len(merged.StockTrades) == 1
        trade = merged.StockTrades[0]
        assert trade.ExchangedMoney.UnderlyingQuantity == 40.0
        # 10-for-1 split: trade price must scale by 1/ratio so post-split price = 10.0 / 10 = 1.0
        assert trade.ExchangedMoney.UnderlyingTradePrice == 1.0
        # Provenance on the trade: one step with before-state and quantities reflecting the split.
        assert len(trade.Provenance) == 1
        step = trade.Provenance[0]
        assert step.QuantityBefore == 4.0
        assert step.QuantityAfter == 40.0
        assert step.BeforeQuantity == 4.0
        assert step.BeforeTradePrice == 10.0

    def test_apply_split_scales_underlying_trade_price(self) -> None:
        """Split must scale UnderlyingTradePrice by 1/ratio (not only quantity); notional qty*price preserved."""
        idFrom = FinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old")
        idTo = FinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New")
        rel = ir.IdentifierRelationshipSplit(
            FromIdentifier=idFrom,
            ToIdentifier=idTo,
            ChangeType=ir.IdentifierChangeType.SPLIT,
            EffectiveDate=ar.get("2024-10-01"),
            QuantityBefore=1.0,
            QuantityAfter=10.0,
        )
        gFrom = _makeGrouping(
            idFrom,
            [_makeTrade("t1", idFrom, 1.0, "2024-09-01", underlying_trade_price=100.0)],
        )
        events = pfe.FinancialEvents(
            Groupings=[gFrom],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.SPLIT])
        assert len(result.Groupings) == 1
        trade = result.Groupings[0].StockTrades[0]
        assert trade.ExchangedMoney.UnderlyingQuantity == 10.0
        assert trade.ExchangedMoney.UnderlyingTradePrice == 10.0  # 100.0 * (1/10)

    def test_apply_split_does_not_scale_trades_on_or_after_effective_date(self) -> None:
        """Trades with Date >= EffectiveDate keep original quantity."""
        idFrom = FinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old")
        idTo = FinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New")
        rel = ir.IdentifierRelationshipSplit(
            FromIdentifier=idFrom,
            ToIdentifier=idTo,
            ChangeType=ir.IdentifierChangeType.SPLIT,
            EffectiveDate=ar.get("2024-10-01"),
            QuantityBefore=1.0,
            QuantityAfter=10.0,
        )
        gFrom = _makeGrouping(idFrom, [_makeTrade("t1", idFrom, 5.0, "2024-10-15")])
        events = pfe.FinancialEvents(
            Groupings=[gFrom],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.SPLIT])
        assert len(result.Groupings) == 1
        assert result.Groupings[0].StockTrades[0].ExchangedMoney.UnderlyingQuantity == 5.0

    def test_apply_split_scales_lots_before_effective_date(self) -> None:
        """StockTaxLots where Acquired.Date < EffectiveDate get Quantity multiplied by ratio."""
        idFrom = FinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old")
        idTo = FinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New")
        rel = ir.IdentifierRelationshipSplit(
            FromIdentifier=idFrom,
            ToIdentifier=idTo,
            ChangeType=ir.IdentifierChangeType.SPLIT,
            EffectiveDate=ar.get("2024-10-01"),
            QuantityBefore=2.0,
            QuantityAfter=20.0,
        )
        acquired = _makeTrade("acq", idFrom, 2.0, "2024-09-01")
        sold = _makeTrade("sold", idFrom, -2.0, "2024-09-15")
        lot = TaxLotStock(
            ID="lot1",
            FinancialIdentifier=idFrom,
            Quantity=2.0,
            Acquired=cast(TradeEventStockAcquired, acquired),
            Sold=cast(TradeEventStockSold, sold),
            ShortLongType=cf.GenericShortLong.LONG,
        )
        gFrom = _makeGrouping(idFrom, [], stockTaxLots=[lot])
        events = pfe.FinancialEvents(
            Groupings=[gFrom],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.SPLIT])
        assert len(result.Groupings) == 1
        assert len(result.Groupings[0].StockTaxLots) == 1
        scaled_lot = result.Groupings[0].StockTaxLots[0]
        assert scaled_lot.Quantity == 20.0
        # Provenance on the lot: one split step with per-lot before quantity.
        assert len(scaled_lot.Provenance) == 1
        step = scaled_lot.Provenance[0]
        assert step.BeforeQuantity == 2.0

    def test_apply_reverse_split_scales_by_ratio(self) -> None:
        """REVERSE_SPLIT: 10 for 1 scales quantities by 1/10."""
        idFrom = FinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old")
        idTo = FinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New")
        rel = ir.IdentifierRelationshipSplit(
            FromIdentifier=idFrom,
            ToIdentifier=idTo,
            ChangeType=ir.IdentifierChangeType.REVERSE_SPLIT,
            EffectiveDate=ar.get("2024-10-01"),
            QuantityBefore=10.0,
            QuantityAfter=1.0,
        )
        gFrom = _makeGrouping(idFrom, [_makeTrade("t1", idFrom, 10.0, "2024-09-01")])
        events = pfe.FinancialEvents(
            Groupings=[gFrom],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.REVERSE_SPLIT])
        assert len(result.Groupings) == 1
        assert result.Groupings[0].FinancialIdentifier.isTheSameAs(idTo)
        assert result.Groupings[0].StockTrades[0].ExchangedMoney.UnderlyingQuantity == 1.0
        # 1-for-10 reverse: trade price must scale by 1/ratio = 10, so 10.0 -> 100.0
        assert result.Groupings[0].StockTrades[0].ExchangedMoney.UnderlyingTradePrice == 100.0

    def test_apply_split_merges_from_into_existing_to_grouping(self) -> None:
        """When To grouping already exists, scaled From is merged into it."""
        idFrom = FinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old")
        idTo = FinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New")
        rel = ir.IdentifierRelationshipSplit(
            FromIdentifier=idFrom,
            ToIdentifier=idTo,
            ChangeType=ir.IdentifierChangeType.SPLIT,
            EffectiveDate=ar.get("2024-10-01"),
            QuantityBefore=1.0,
            QuantityAfter=10.0,
        )
        gFrom = _makeGrouping(idFrom, [_makeTrade("t1", idFrom, 1.0, "2024-09-01")])
        gTo = _makeGrouping(idTo, [_makeTrade("t2", idTo, 5.0, "2024-10-15")])
        events = pfe.FinancialEvents(
            Groupings=[gFrom, gTo],
            IdentifierRelationships=[rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(events, changeTypesToApply=[ir.IdentifierChangeType.SPLIT])
        assert len(result.Groupings) == 1
        merged = result.Groupings[0]
        assert merged.FinancialIdentifier.isTheSameAs(idTo)
        assert len(merged.StockTrades) == 2
        qtys = sorted([t.ExchangedMoney.UnderlyingQuantity for t in merged.StockTrades])
        assert qtys == [5.0, 10.0]


class TestApplyIdentifierRelationshipsServiceSmciIntegration:
    """End-to-end test: SMCI-style 10-for-1 split (4 old -> 40 new) through pipeline, then apply SPLIT."""

    def test_smci_style_split_pipeline_produces_single_grouping_with_scaled_quantities(self) -> None:
        """Corporate actions (4 old, 40 new) -> transform -> resolve -> core FinancialEvents with one grouping -> apply SPLIT -> one grouping US86800U3023, 4 scaled to 40."""
        segmented = st.SegmentedTrades(
            cashTransactions=[],
            corporateActions=[tf._corporateActionOld, tf._corporateActionNew],
            stockTrades=[],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )
        staging = ibkr_t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)
        resolution = IdentifierRelationshipResolution()
        resolved = resolution.resolveStagingFinancialEventsPartialRelationships(staging)
        assert len(resolved.IdentifierRelationships.Relationships) == 1
        rel = resolved.IdentifierRelationships.Relationships[0]
        assert rel.ChangeType == StagingIdentifierChangeType.SPLIT
        assert isinstance(rel, StagingIdentifierRelationshipSplit)
        assert rel.QuantityBefore == 4.0
        assert rel.QuantityAfter == 40.0

        id_old = FinancialIdentifier(ISIN="US86800U1043", Ticker="SMCI.OLD", Name="Old")
        id_new = FinancialIdentifier(ISIN="US86800U3023", Ticker="SMCI", Name="New")
        core_rel = ir.IdentifierRelationshipSplit(
            FromIdentifier=id_old,
            ToIdentifier=id_new,
            ChangeType=ir.IdentifierChangeType.SPLIT,
            EffectiveDate=ar.get("2024-09-30 20:25:00"),
            QuantityBefore=4.0,
            QuantityAfter=40.0,
        )
        g_old = _makeGrouping(id_old, [_makeTrade("t1", id_old, 4.0, "2024-09-01")])
        financial_events = pfe.FinancialEvents(
            Groupings=[g_old],
            IdentifierRelationships=[core_rel],
        )
        service = ApplyIdentifierRelationshipsService()
        result = service.apply(
            financial_events,
            changeTypesToApply=[ir.IdentifierChangeType.SPLIT, ir.IdentifierChangeType.REVERSE_SPLIT],
        )
        assert len(result.Groupings) == 1
        merged = result.Groupings[0]
        assert merged.FinancialIdentifier.getIsin() == "US86800U3023"
        assert merged.StockTrades[0].ExchangedMoney.UnderlyingQuantity == 40.0
