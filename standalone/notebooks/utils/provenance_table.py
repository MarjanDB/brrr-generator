"""
Build a provenance table and affected-items map from applied FinancialEvents.

Used by notebooks to show "Events of Interest" for renames/splits.
Use the method for the asset kind you are reporting on (stocks, derivatives, or dividends).
"""

from typing import Any

import pandas as pd

from Core.FinancialEvents.Schemas.FinancialEvents import FinancialEvents
from Core.FinancialEvents.Schemas.Provenance import ProvenanceStep, SplitProvenanceStep


def _relationshipKey(step: ProvenanceStep) -> tuple[Any, Any, str, str]:
    """One key per provenance event (same From/To/ChangeType/Date). Date-only so table lookup matches."""
    from_isin = step.FromIdentifier.getIsin() if step.FromIdentifier else None
    to_isin = step.ToIdentifier.getIsin() if step.ToIdentifier else None
    date_str = step.EffectiveDate.format("YYYY-MM-DD")
    return (from_isin, to_isin, step.ChangeType.name, date_str)


def _rowForStep(step: ProvenanceStep) -> dict[str, Any]:
    """Single row dict for a provenance step."""
    q_before = step.QuantityBefore if isinstance(step, SplitProvenanceStep) else None
    q_after = step.QuantityAfter if isinstance(step, SplitProvenanceStep) else None
    return {
        "ChangeType": step.ChangeType.name,
        "EffectiveDate": step.EffectiveDate.format("YYYY-MM-DD"),
        "FromISIN": step.FromIdentifier.getIsin() if step.FromIdentifier else "",
        "FromTicker": step.FromIdentifier.getTicker() if step.FromIdentifier else "",
        "ToISIN": step.ToIdentifier.getIsin() if step.ToIdentifier else "",
        "ToTicker": step.ToIdentifier.getTicker() if step.ToIdentifier else "",
        "QuantityBefore": q_before,
        "QuantityAfter": q_after,
    }


def _ensureRowForStep(
    step: ProvenanceStep,
    steps_seen: dict[tuple[Any, Any, str, str], int],
    rows: list[dict[str, Any]],
    affected_by_key: dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]],
) -> tuple[Any, Any, str, str]:
    """Ensure a table row exists for this step; return the relationship key."""
    key = _relationshipKey(step)
    if key not in steps_seen:
        steps_seen[key] = len(rows)
        rows.append(_rowForStep(step))
        affected_by_key[key] = []
    return key


def _addStockAffectedColumns(
    df: pd.DataFrame,
    affected_by_key: dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]],
) -> None:
    """Add AffectedStockTrades, AffectedStockLots, AffectedCount (events only; grouping not counted)."""
    trades = df.apply(
        lambda r: sum(1 for it in affected_by_key.get(rowKeyFromRow(r), []) if it[0] == "StockTrade"),
        axis=1,
    )
    lots = df.apply(
        lambda r: sum(1 for it in affected_by_key.get(rowKeyFromRow(r), []) if it[0] == "StockLot"),
        axis=1,
    )
    df["AffectedStockTrades"] = trades
    df["AffectedStockLots"] = lots
    df["AffectedCount"] = trades + lots


def collectProvenanceTableForStocks(
    events: FinancialEvents,
) -> tuple[pd.DataFrame, dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]]]:
    """Provenance table and affected-items map for stock reports (stock trades and stock lots only).
    Only groupings that have stock trades or stock lots are included. The grouping itself is not
    counted in affected totals; counts are split per asset category."""
    steps_seen: dict[tuple[Any, Any, str, str], int] = {}
    rows: list[dict[str, Any]] = []
    affected_by_key: dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]] = {}

    for g in events.Groupings:
        if not g.StockTrades and not g.StockTaxLots:
            continue

        for step in g.Provenance:
            _ensureRowForStep(step, steps_seen, rows, affected_by_key)

        for t in g.StockTrades:
            for step in t.Provenance:
                key = _ensureRowForStep(step, steps_seen, rows, affected_by_key)
                qty = t.ExchangedMoney.UnderlyingQuantity if t.ExchangedMoney else None
                affected_by_key[key].append(("StockTrade", t.ID, t.Date.format("YYYY-MM-DD") if t.Date else None, qty))

        for lot in g.StockTaxLots:
            for step in lot.Provenance:
                key = _ensureRowForStep(step, steps_seen, rows, affected_by_key)
                affected_by_key[key].append(("StockLot", lot.ID, None, lot.Quantity))

    df = pd.DataFrame(rows)
    if not df.empty:
        _addStockAffectedColumns(df, affected_by_key)
    return df, affected_by_key


def _addDerivativeAffectedColumns(
    df: pd.DataFrame,
    affected_by_key: dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]],
) -> None:
    """Add AffectedDerivativeTrades, AffectedDerivativeLots, AffectedCount (events only; groupings not counted)."""
    trades = df.apply(
        lambda r: sum(1 for it in affected_by_key.get(rowKeyFromRow(r), []) if it[0] == "DerivativeTrade"),
        axis=1,
    )
    lots = df.apply(
        lambda r: sum(1 for it in affected_by_key.get(rowKeyFromRow(r), []) if it[0] == "DerivativeLot"),
        axis=1,
    )
    df["AffectedDerivativeTrades"] = trades
    df["AffectedDerivativeLots"] = lots
    df["AffectedCount"] = trades + lots


def collectProvenanceTableForDerivatives(
    events: FinancialEvents,
) -> tuple[pd.DataFrame, dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]]]:
    """Provenance table and affected-items map for derivative reports (derivative trades and lots only).
    Only groupings that have derivative trades or lots are included. Groupings are not counted in
    affected totals; counts are split per asset category."""
    steps_seen: dict[tuple[Any, Any, str, str], int] = {}
    rows: list[dict[str, Any]] = []
    affected_by_key: dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]] = {}

    for g in events.Groupings:
        has_derivative_content = any(
            dg.DerivativeTrades or dg.DerivativeTaxLots for dg in g.DerivativeGroupings
        )
        if not has_derivative_content:
            continue

        for step in g.Provenance:
            _ensureRowForStep(step, steps_seen, rows, affected_by_key)

        for dg in g.DerivativeGroupings:
            for step in dg.Provenance:
                _ensureRowForStep(step, steps_seen, rows, affected_by_key)
            for t in dg.DerivativeTrades:
                for step in t.Provenance:
                    key = _ensureRowForStep(step, steps_seen, rows, affected_by_key)
                    qty = t.ExchangedMoney.UnderlyingQuantity if t.ExchangedMoney else None
                    affected_by_key[key].append(("DerivativeTrade", t.ID, t.Date.format("YYYY-MM-DD") if t.Date else None, qty))
            for lot in dg.DerivativeTaxLots:
                for step in lot.Provenance:
                    key = _ensureRowForStep(step, steps_seen, rows, affected_by_key)
                    affected_by_key[key].append(("DerivativeLot", lot.ID, None, lot.Quantity))

    df = pd.DataFrame(rows)
    if not df.empty:
        _addDerivativeAffectedColumns(df, affected_by_key)
    return df, affected_by_key


def _addDividendAffectedColumns(
    df: pd.DataFrame,
    affected_by_key: dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]],
) -> None:
    """Add AffectedGroupings and AffectedCount (dividend report is grouping-level only)."""
    groupings = df.apply(
        lambda r: sum(1 for it in affected_by_key.get(rowKeyFromRow(r), []) if it[0] == "Grouping"),
        axis=1,
    )
    df["AffectedGroupings"] = groupings
    df["AffectedCount"] = groupings


def collectProvenanceTableForDividends(
    events: FinancialEvents,
) -> tuple[pd.DataFrame, dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]]]:
    """Provenance table and affected-items map for dividend reports (grouping-level only).
    Only groupings that have cash transactions (dividend-relevant) are listed as affected.
    Counts are split per asset category (here: AffectedGroupings only)."""
    steps_seen: dict[tuple[Any, Any, str, str], int] = {}
    rows: list[dict[str, Any]] = []
    affected_by_key: dict[tuple[Any, Any, str, str], list[tuple[str, Any, Any, Any]]] = {}

    for g in events.Groupings:
        if not g.CashTransactions:
            continue
        fid = g.FinancialIdentifier
        id_str = fid.getIsin() or fid.getTicker() or fid.getName() or ""

        for step in g.Provenance:
            key = _ensureRowForStep(step, steps_seen, rows, affected_by_key)
            affected_by_key[key].append(("Grouping", id_str, None, None))

    df = pd.DataFrame(rows)
    if not df.empty:
        _addDividendAffectedColumns(df, affected_by_key)
    return df, affected_by_key


def rowKeyFromRow(r: pd.Series | dict[str, Any]) -> tuple[Any, Any, str, str]:
    """Key for a provenance table row to look up affected items (must match _relationshipKey)."""
    if isinstance(r, pd.Series):
        return (r["FromISIN"] or None, r["ToISIN"] or None, r["ChangeType"], r["EffectiveDate"])
    return (r.get("FromISIN") or None, r.get("ToISIN") or None, r["ChangeType"], r["EffectiveDate"])
