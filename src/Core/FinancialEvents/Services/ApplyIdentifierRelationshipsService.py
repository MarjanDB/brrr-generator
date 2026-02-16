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
            if isinstance(r, IdentifierRelationshipSplit)
            and r.ChangeType in changeTypesToApply
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
        """Scale quantities in the From grouping for events before EffectiveDate, then merge From into To."""
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
            if t.Date < relationship.EffectiveDate:
                m = t.ExchangedMoney
                new_money = cf.GenericMonetaryExchangeInformation(
                    UnderlyingCurrency=m.UnderlyingCurrency,
                    UnderlyingQuantity=m.UnderlyingQuantity * ratio,
                    UnderlyingTradePrice=m.UnderlyingTradePrice,
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
            else:
                scaled_trades.append(t)

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
