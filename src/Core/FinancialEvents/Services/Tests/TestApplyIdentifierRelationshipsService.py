import arrow as ar

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.FinancialEvents as pfe
import Core.FinancialEvents.Schemas.Grouping as pgf
import Core.FinancialEvents.Schemas.IdentifierRelationship as ir
from Core.FinancialEvents.Schemas.Events import (
    TradeEventStockAcquired,
    TradeEventStockSold,
)
from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier
from Core.FinancialEvents.Services.ApplyIdentifierRelationshipsService import (
    ApplyIdentifierRelationshipsService,
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


def _makeTrade(id: str, identifier: FinancialIdentifier, qty: float, date_str: str) -> TradeEventStockAcquired | TradeEventStockSold:
    money = cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="USD",
        UnderlyingQuantity=qty,
        UnderlyingTradePrice=10.0,
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
        assert result.Groupings[0].FinancialIdentifier.isTheSameAs(idC)
        assert len(result.Groupings[0].StockTrades) == 2

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
