import type { TradeEventStockAcquired, TradeEventStockSold, TransactionCash } from "@brrr/core/schemas/Events.ts";
import type { FinancialEvents } from "@brrr/core/schemas/FinancialEvents.ts";
import type { FinancialIdentifier } from "@brrr/core/schemas/FinancialIdentifier.ts";
import type { DerivativeGrouping, FinancialGrouping } from "@brrr/core/schemas/Grouping.ts";
import type { IdentifierRelationshipSplit } from "@brrr/core/schemas/IdentifierRelationship.ts";
import { IdentifierChangeType } from "@brrr/core/schemas/IdentifierRelationship.ts";
import type { TaxLotStock } from "@brrr/core/schemas/Lots.ts";
import type { AnyProvenanceStep, RenameProvenanceStep, SplitProvenanceStep } from "@brrr/core/schemas/Provenance.ts";

export class ApplyIdentifierRelationshipsService {
	apply(events: FinancialEvents, changeTypesToApply: IdentifierChangeType[]): FinancialEvents {
		let current = events;

		if (changeTypesToApply.includes(IdentifierChangeType.RENAME)) {
			current = this._applyRename(current);
		}

		const relsForSplits = current.identifierRelationships.filter(
			(r): r is IdentifierRelationshipSplit => "quantityBefore" in r && changeTypesToApply.includes(r.changeType),
		);

		for (const rel of [...relsForSplits].sort((a, b) => a.effectiveDate.toMillis() - b.effectiveDate.toMillis())) {
			current = this._applySplitOrReverseSplit(current, rel);
		}

		return current;
	}

	private _applyRename(events: FinancialEvents): FinancialEvents {
		const rels = events.identifierRelationships.filter((r) => r.changeType === IdentifierChangeType.RENAME);
		if (rels.length === 0) return events;

		const pairs = rels.map((r) => [r.fromIdentifier, r.toIdentifier] as const);

		const _sink = (identifier: FinancialIdentifier): FinancialIdentifier => {
			for (const [fromId, toId] of pairs) {
				if (fromId.isTheSameAs(identifier)) return _sink(toId);
			}
			return identifier;
		};

		const idToSink = new Map<FinancialIdentifier, FinancialIdentifier>();
		for (const r of rels) {
			idToSink.set(r.fromIdentifier, _sink(r.fromIdentifier));
			idToSink.set(r.toIdentifier, _sink(r.toIdentifier));
		}

		const _getSink = (identifier: FinancialIdentifier): FinancialIdentifier | null => {
			for (const [node, sink] of idToSink) {
				if (node.sameInstrumentByIsin(identifier) || sink.sameInstrumentByIsin(identifier)) {
					return sink;
				}
			}
			return null;
		};

		const notAffected: FinancialGrouping[] = [];
		const bySink = new Map<string, { sink: FinancialIdentifier; groupings: FinancialGrouping[] }>();

		for (const g of events.groupings) {
			const sink = _getSink(g.financialIdentifier);
			if (sink === null) {
				notAffected.push(g);
			} else {
				const key = sink.toKey();
				const existing = bySink.get(key);
				if (existing) {
					existing.groupings.push(g);
				} else {
					bySink.set(key, { sink, groupings: [g] });
				}
			}
		}

		// Build provenance per sink
		const sinkToProvenance = new Map<string, AnyProvenanceStep[]>();
		for (const r of rels) {
			const sink = _sink(r.toIdentifier);
			const key = sink.toKey();
			const step: RenameProvenanceStep = {
				kind: "rename",
				fromIdentifier: r.fromIdentifier,
				toIdentifier: r.toIdentifier,
				changeType: r.changeType,
				effectiveDate: r.effectiveDate,
			};
			const existing = sinkToProvenance.get(key) ?? [];
			// Avoid duplicates
			if (!existing.some((s) => s.fromIdentifier.isTheSameAs(step.fromIdentifier) && s.toIdentifier.isTheSameAs(step.toIdentifier))) {
				existing.push(step);
			}
			sinkToProvenance.set(key, existing);
		}

		const merged = [...bySink.values()].map(({ sink, groupings }) =>
			this._mergeGroupings(sink, groupings, sinkToProvenance.get(sink.toKey()) ?? [])
		);

		return {
			groupings: [...notAffected, ...merged],
			identifierRelationships: events.identifierRelationships,
		};
	}

	private _applySplitOrReverseSplit(events: FinancialEvents, relationship: IdentifierRelationshipSplit): FinancialEvents {
		if (relationship.quantityBefore === 0) return events;
		const ratio = relationship.quantityAfter / relationship.quantityBefore;

		const fromGrouping = events.groupings.find((g) => relationship.fromIdentifier.sameInstrumentByIsin(g.financialIdentifier)) ?? null;
		if (!fromGrouping) return events;

		const scaledTrades: (TradeEventStockAcquired | TradeEventStockSold)[] = [];
		for (const t of fromGrouping.stockTrades) {
			if (!(t.date < relationship.effectiveDate)) {
				scaledTrades.push(t);
				continue;
			}

			const m = t.exchangedMoney;
			const step: SplitProvenanceStep = {
				kind: "split",
				fromIdentifier: relationship.fromIdentifier,
				toIdentifier: relationship.toIdentifier,
				changeType: relationship.changeType,
				effectiveDate: relationship.effectiveDate,
				quantityBefore: m.underlyingQuantity,
				quantityAfter: m.underlyingQuantity * ratio,
				beforeQuantity: m.underlyingQuantity,
				beforeTradePrice: m.underlyingTradePrice,
				beforeExchangedMoney: m,
			};

			const newMoney = {
				...m,
				underlyingQuantity: m.underlyingQuantity * ratio,
				underlyingTradePrice: m.underlyingTradePrice * (1 / ratio),
			};

			if (t.kind === "StockAcquired") {
				scaledTrades.push({
					...t,
					exchangedMoney: newMoney,
					provenance: [...t.provenance, step],
				});
			} else {
				scaledTrades.push({
					...t,
					exchangedMoney: newMoney,
					provenance: [...t.provenance, step],
				});
			}
		}

		const scaledLots: TaxLotStock[] = [];
		for (const lot of fromGrouping.stockTaxLots) {
			if (lot.acquired.date < relationship.effectiveDate) {
				const step: SplitProvenanceStep = {
					kind: "split",
					fromIdentifier: relationship.fromIdentifier,
					toIdentifier: relationship.toIdentifier,
					changeType: relationship.changeType,
					effectiveDate: relationship.effectiveDate,
					quantityBefore: relationship.quantityBefore,
					quantityAfter: relationship.quantityAfter,
					beforeQuantity: lot.quantity,
				};
				scaledLots.push({
					...lot,
					quantity: lot.quantity * ratio,
					provenance: [...lot.provenance, step],
				});
			} else {
				scaledLots.push(lot);
			}
		}

		const splitStep: SplitProvenanceStep = {
			kind: "split",
			fromIdentifier: relationship.fromIdentifier,
			toIdentifier: relationship.toIdentifier,
			changeType: relationship.changeType,
			effectiveDate: relationship.effectiveDate,
			quantityBefore: relationship.quantityBefore,
			quantityAfter: relationship.quantityAfter,
		};

		const scaledFrom: FinancialGrouping = {
			...fromGrouping,
			stockTrades: scaledTrades,
			stockTaxLots: scaledLots,
			provenance: [...fromGrouping.provenance, splitStep],
		};

		const toGrouping =
			events.groupings.find((g) => g !== fromGrouping && relationship.toIdentifier.sameInstrumentByIsin(g.financialIdentifier)) ??
				null;

		let mergedGrouping: FinancialGrouping;
		if (toGrouping !== null) {
			mergedGrouping = this._mergeGroupings(
				relationship.toIdentifier,
				[scaledFrom, toGrouping],
				[...scaledFrom.provenance, ...toGrouping.provenance],
			);
		} else {
			mergedGrouping = this._mergeGroupings(
				relationship.toIdentifier,
				[scaledFrom],
				scaledFrom.provenance,
			);
		}

		const other = events.groupings.filter((g) => g !== fromGrouping && g !== toGrouping);
		return {
			groupings: [...other, mergedGrouping],
			identifierRelationships: events.identifierRelationships,
		};
	}

	private _mergeGroupings(
		properId: FinancialIdentifier,
		groupings: FinancialGrouping[],
		groupingProvenance: AnyProvenanceStep[],
	): FinancialGrouping {
		const first = groupings[0];
		const allStockTrades: (TradeEventStockAcquired | TradeEventStockSold)[] = [];
		const allStockTaxLots: TaxLotStock[] = [];
		const allDerivativeGroupings: DerivativeGrouping[] = [];
		const allCashTransactions: TransactionCash[] = [];

		for (const g of groupings) {
			for (const t of g.stockTrades) allStockTrades.push({ ...t, financialIdentifier: properId });
			for (const lot of g.stockTaxLots) {
				allStockTaxLots.push({
					...lot,
					financialIdentifier: properId,
					acquired: { ...lot.acquired, financialIdentifier: properId },
					sold: { ...lot.sold, financialIdentifier: properId },
				});
			}
			for (const dg of g.derivativeGroupings) {
				allDerivativeGroupings.push({
					...dg,
					financialIdentifier: properId,
					derivativeTrades: dg.derivativeTrades.map((t) => ({ ...t, financialIdentifier: properId })),
					derivativeTaxLots: dg.derivativeTaxLots.map((lot) => ({
						...lot,
						financialIdentifier: properId,
						acquired: { ...lot.acquired, financialIdentifier: properId },
						sold: { ...lot.sold, financialIdentifier: properId },
					})),
				});
			}
			for (const c of g.cashTransactions) allCashTransactions.push({ ...c, financialIdentifier: properId });
		}

		return {
			financialIdentifier: properId,
			countryOfOrigin: first.countryOfOrigin,
			underlyingCategory: first.underlyingCategory,
			stockTrades: allStockTrades,
			stockTaxLots: allStockTaxLots,
			derivativeGroupings: allDerivativeGroupings,
			cashTransactions: allCashTransactions,
			provenance: groupingProvenance,
		};
	}
}
