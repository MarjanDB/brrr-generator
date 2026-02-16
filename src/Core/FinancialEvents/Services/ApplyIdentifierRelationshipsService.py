from typing import Sequence

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.Events as pe
import Core.FinancialEvents.Schemas.FinancialEvents as pfe
import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier
from Core.FinancialEvents.Schemas.IdentifierRelationship import (
    IdentifierChangeType,
    IdentifierRelationship,
    IdentifierRelationshipSplit,
)


class ApplyIdentifierRelationshipsService:
    """
    Bakes in selected identifier relationship types (e.g. RENAME, SPLIT, REVERSE_SPLIT)
    by producing new financial groupings.

    - RENAME: merges groupings along rename chains and normalizes to the sink identifier.
    - SPLIT / REVERSE_SPLIT: a corporate action changes the instrument identifier (e.g. ISIN).
      We treat the relationship as FromIdentifier (old ISIN) → ToIdentifier (new ISIN).
      Only the old-ISIN (From) grouping is scaled for that split; the new ISIN (To) is not.
      We scale pre-effective-date quantities in the From grouping, then merge it into the To
      grouping so all events end up under the new identifier. Applied in EffectiveDate order.
      In a chain (e.g. ISIN.OLD.OLD → split → ISIN.OLD → split → ISIN), each split is applied
      in order: the oldest ISIN is scaled and merged into the next, then that grouping is
      scaled by the next split and merged again, so the original position is scaled by every
      ratio along the chain.

    Tax authorities (or the pipeline) decide which change types to apply.

    Application order: RENAME first, then SPLIT/REVERSE_SPLIT by EffectiveDate.
    We apply renames before splits so that all same-instrument groupings (e.g. same ISIN,
    different ticker merged by a rename) are consolidated into one before we apply a split.
    Otherwise a split would only scale and merge the first matching "old ISIN" grouping
    (next()), leaving other same-ISIN groupings (e.g. other ticker) behind.
    """

    def apply(
        self,
        events: pfe.FinancialEvents,
        changeTypesToApply: Sequence[IdentifierChangeType],
    ) -> pfe.FinancialEvents:
        """Apply selected relationship types: RENAME first, then SPLIT/REVERSE_SPLIT by EffectiveDate."""
        current = events

        if IdentifierChangeType.RENAME in changeTypesToApply:
            current = self._applyRename(current)

        relsForSplits = [
            r for r in current.IdentifierRelationships if isinstance(r, IdentifierRelationshipSplit) and r.ChangeType in changeTypesToApply
        ]
        for rel in sorted(relsForSplits, key=lambda r: r.EffectiveDate):
            current = self._applySplitOrReverseSplit(current, rel)

        return current

    def _applyRename(self, events: pfe.FinancialEvents) -> pfe.FinancialEvents:
        """Merge groupings by rename chains and normalize identifiers to the sink (proper) identifier."""
        rels = [r for r in events.IdentifierRelationships if r.ChangeType == IdentifierChangeType.RENAME]
        if not rels:
            return events

        pairs = [(r.FromIdentifier, r.ToIdentifier) for r in rels]

        def _sink(identifier: FinancialIdentifier) -> FinancialIdentifier:
            """Follow rename edges to the end of the chain (sink)."""
            for from_id, to_id in pairs:
                if from_id.isTheSameAs(identifier):
                    return _sink(to_id)
            return identifier

        # Every identifier in any relationship (from or to) -> its chain sink. FinancialIdentifier is hashable, so dict works.
        id_to_sink: dict[FinancialIdentifier, FinancialIdentifier] = {}
        for r in rels:
            id_to_sink[r.FromIdentifier] = _sink(r.FromIdentifier)
            id_to_sink[r.ToIdentifier] = _sink(r.ToIdentifier)

        def _getSink(identifier: FinancialIdentifier) -> FinancialIdentifier | None:
            for node, sink in id_to_sink.items():
                if node.sameInstrumentByIsin(identifier) or sink.sameInstrumentByIsin(identifier):
                    return sink
            return None

        notAffected: list[pgf.FinancialGrouping] = []
        by_sink: dict[FinancialIdentifier, list[pgf.FinancialGrouping]] = {}
        for g in events.Groupings:
            sink = _getSink(g.FinancialIdentifier)
            if sink is None:
                notAffected.append(g)
            else:
                by_sink.setdefault(sink, []).append(g)

        merged = [self._mergeGroupings(sink, group_list) for sink, group_list in by_sink.items()]
        return pfe.FinancialEvents(
            Groupings=notAffected + merged,
            IdentifierRelationships=events.IdentifierRelationships,
        )

    def _applySplitOrReverseSplit(
        self,
        events: pfe.FinancialEvents,
        relationship: IdentifierRelationshipSplit,
    ) -> pfe.FinancialEvents:
        """
        Apply one SPLIT or REVERSE_SPLIT: scale pre-effective-date quantities in the grouping
        for the old identifier (FromIdentifier), then merge that grouping into the one for the
        new identifier (ToIdentifier). Result: a single grouping under the new ISIN with scaled
        historical quantities and any post-split activity already under that ISIN.
        """
        if relationship.QuantityBefore == 0:
            return events
        ratio = relationship.QuantityAfter / relationship.QuantityBefore
        from_grouping = next(
            (g for g in events.Groupings if relationship.FromIdentifier.sameInstrumentByIsin(g.FinancialIdentifier)),
            None,
        )
        if from_grouping is None:
            return events

        scaled_trades: list[pe.TradeEventStockAcquired | pe.TradeEventStockSold] = []
        for t in from_grouping.StockTrades:
            if not t.Date < relationship.EffectiveDate:
                scaled_trades.append(t)
                continue

            m = t.ExchangedMoney
            new_money = cf.GenericMonetaryExchangeInformation(
                UnderlyingCurrency=m.UnderlyingCurrency,
                UnderlyingQuantity=m.UnderlyingQuantity * ratio,
                UnderlyingTradePrice=m.UnderlyingTradePrice * 1 / ratio,
                ComissionCurrency=m.ComissionCurrency,
                ComissionTotal=m.ComissionTotal,
                TaxCurrency=m.TaxCurrency,
                TaxTotal=m.TaxTotal,
                FxRateToBase=m.FxRateToBase,
            )

            if isinstance(t, pe.TradeEventStockAcquired):
                scaled_trades.append(
                    pe.TradeEventStockAcquired(
                        ID=t.ID,
                        FinancialIdentifier=t.FinancialIdentifier,
                        AssetClass=t.AssetClass,
                        Date=t.Date,
                        Multiplier=t.Multiplier,
                        ExchangedMoney=new_money,
                        AcquiredReason=t.AcquiredReason,
                    )
                )
            else:
                scaled_trades.append(
                    pe.TradeEventStockSold(
                        ID=t.ID,
                        FinancialIdentifier=t.FinancialIdentifier,
                        AssetClass=t.AssetClass,
                        Date=t.Date,
                        Multiplier=t.Multiplier,
                        ExchangedMoney=new_money,
                    )
                )

        scaled_lots: list[pgf.TaxLotStock] = []
        for lot in from_grouping.StockTaxLots:
            if lot.Acquired.Date < relationship.EffectiveDate:
                scaled_lots.append(
                    pgf.TaxLotStock(
                        ID=lot.ID,
                        FinancialIdentifier=lot.FinancialIdentifier,
                        Quantity=lot.Quantity * ratio,
                        Acquired=lot.Acquired,
                        Sold=lot.Sold,
                        ShortLongType=lot.ShortLongType,
                    )
                )
            else:
                scaled_lots.append(lot)

        scaled_from = pgf.FinancialGrouping(
            FinancialIdentifier=from_grouping.FinancialIdentifier,
            CountryOfOrigin=from_grouping.CountryOfOrigin,
            UnderlyingCategory=from_grouping.UnderlyingCategory,
            StockTrades=scaled_trades,
            StockTaxLots=scaled_lots,
            DerivativeGroupings=from_grouping.DerivativeGroupings,
            CashTransactions=from_grouping.CashTransactions,
        )

        to_grouping = next(
            (g for g in events.Groupings if relationship.ToIdentifier.sameInstrumentByIsin(g.FinancialIdentifier)),
            None,
        )
        if to_grouping is not None:
            merged = self._mergeGroupings(relationship.ToIdentifier, [scaled_from, to_grouping])
        else:
            merged = self._mergeGroupings(relationship.ToIdentifier, [scaled_from])

        other = [g for g in events.Groupings if g is not from_grouping and g is not to_grouping]
        return pfe.FinancialEvents(
            Groupings=other + [merged],
            IdentifierRelationships=events.IdentifierRelationships,
        )

    def _mergeGroupings(
        self,
        properId: FinancialIdentifier,
        groupings: list[pgf.FinancialGrouping],
    ) -> pgf.FinancialGrouping:
        first = groupings[0]
        allStockTrades: list[pe.TradeEventStockAcquired | pe.TradeEventStockSold] = []
        allStockTaxLots: list[pgf.TaxLotStock] = []
        allDerivativeGroupings: list[pgf.DerivativeGrouping] = []
        allCashTransactions: list[pe.TransactionCash] = []

        for g in groupings:
            for t in g.StockTrades:
                allStockTrades.append(self._withIdentifier(t, properId))
            for lot in g.StockTaxLots:
                allStockTaxLots.append(self._lotWithIdentifier(lot, properId))
            for dg in g.DerivativeGroupings:
                allDerivativeGroupings.append(self._derivativeGroupingWithIdentifier(dg, properId))
            for c in g.CashTransactions:
                allCashTransactions.append(self._withIdentifier(c, properId))

        return pgf.FinancialGrouping(
            FinancialIdentifier=properId,
            CountryOfOrigin=first.CountryOfOrigin,
            UnderlyingCategory=first.UnderlyingCategory,
            StockTrades=allStockTrades,
            StockTaxLots=allStockTaxLots,
            DerivativeGroupings=allDerivativeGroupings,
            CashTransactions=allCashTransactions,
        )

    def _withIdentifier(self, event: pe.TradeEvent, identifier: FinancialIdentifier) -> pe.TradeEvent:
        event.FinancialIdentifier = identifier
        return event

    def _lotWithIdentifier(self, lot: pgf.TaxLotStock, identifier: FinancialIdentifier) -> pgf.TaxLotStock:
        return pgf.TaxLotStock(
            ID=lot.ID,
            FinancialIdentifier=identifier,
            Quantity=lot.Quantity,
            Acquired=self._withIdentifier(lot.Acquired, identifier),
            Sold=self._withIdentifier(lot.Sold, identifier),
            ShortLongType=lot.ShortLongType,
        )

    def _derivativeGroupingWithIdentifier(
        self,
        dg: pgf.DerivativeGrouping,
        identifier: FinancialIdentifier,
    ) -> pgf.DerivativeGrouping:
        newTrades = [self._withIdentifier(t, identifier) for t in dg.DerivativeTrades]

        newLots = [
            pgf.TaxLotDerivative(
                ID=lot.ID,
                FinancialIdentifier=identifier,
                Quantity=lot.Quantity,
                Acquired=self._withIdentifier(lot.Acquired, identifier),
                Sold=self._withIdentifier(lot.Sold, identifier),
                ShortLongType=lot.ShortLongType,
            )
            for lot in dg.DerivativeTaxLots
        ]

        return pgf.DerivativeGrouping(
            FinancialIdentifier=identifier,
            DerivativeTrades=newTrades,
            DerivativeTaxLots=newLots,
        )
