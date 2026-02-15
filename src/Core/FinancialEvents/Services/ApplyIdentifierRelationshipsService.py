from typing import Sequence

import Core.FinancialEvents.Schemas.Events as pe
import Core.FinancialEvents.Schemas.FinancialEvents as pfe
import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier
from Core.FinancialEvents.Schemas.IdentifierRelationship import (
    IdentifierChangeType,
    IdentifierRelationship,
)


class ApplyIdentifierRelationshipsService:
    """
    Bakes in selected identifier relationship types (e.g. RENAME, SPLIT, REVERSE_SPLIT)
    by producing new financial groupings. RENAME merges groupings and normalizes to the
    proper identifier; SPLIT/REVERSE_SPLIT adjust quantities in date order.
    Tax authorities (or the pipeline) decide which change types to apply.
    """

    def apply(
        self,
        events: pfe.FinancialEvents,
        changeTypesToApply: Sequence[IdentifierChangeType],
    ) -> pfe.FinancialEvents:
        """Entrypoint: apply selected relationship types. RENAME first, then SPLIT/REVERSE_SPLIT by EffectiveDate."""
        current = events

        if IdentifierChangeType.RENAME in changeTypesToApply:
            current = self._applyRename(current)

        relsForSplits = [
            r
            for r in current.IdentifierRelationships
            if r.ChangeType in changeTypesToApply and r.ChangeType in [IdentifierChangeType.SPLIT, IdentifierChangeType.REVERSE_SPLIT]
        ]
        for rel in sorted(relsForSplits, key=lambda r: r.EffectiveDate):
            if rel.ChangeType == IdentifierChangeType.SPLIT:
                current = self._applySplit(current, rel)
            elif rel.ChangeType == IdentifierChangeType.REVERSE_SPLIT:
                current = self._applyReverseSplit(current, rel)

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
                if node.isTheSameAs(identifier) or sink.isTheSameAs(identifier):
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

    def _applySplit(self, events: pfe.FinancialEvents, relationship: IdentifierRelationship) -> pfe.FinancialEvents:
        """Apply a SPLIT (1 share -> 2+): adjust quantities in the affected grouping. Not yet implemented."""
        return events

    def _applyReverseSplit(self, events: pfe.FinancialEvents, relationship: IdentifierRelationship) -> pfe.FinancialEvents:
        """Apply a REVERSE_SPLIT (2+ shares -> 1): adjust quantities in the affected grouping. Not yet implemented."""
        return events

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
