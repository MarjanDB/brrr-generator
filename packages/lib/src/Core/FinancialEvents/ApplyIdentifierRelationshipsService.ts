import { ExchangedMoney } from "@brrr/Core/Schemas/Events/ExchangedMoney";
import type { TradeEventStock } from "@brrr/Core/Schemas/Events/Stock/TradeEventStock";
import { TradeEventStockAcquired } from "@brrr/Core/Schemas/Events/Stock/TradeEventStockAcquired";
import { TradeEventStockSold } from "@brrr/Core/Schemas/Events/Stock/TradeEventStockSold";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { DerivativeGrouping } from "@brrr/Core/Schemas/Groupings/DerivativeGrouping";
import { FinancialGrouping } from "@brrr/Core/Schemas/Groupings/FinancialGrouping";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierChangeType";
import { IdentifierRelationshipSplit } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierRelationshipSplit";
import type { FinancialIdentifierKey } from "@brrr/Core/Schemas/Identifiers";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/Instrument/FinancialIdentifier";
import { TaxLot, type TaxLotStock } from "@brrr/Core/Schemas/Lots/TaxLot";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance/AnyProvenanceStep";
import { RenameProvenanceStep } from "@brrr/Core/Schemas/Provenance/RenameProvenanceStep";
import { SplitProvenanceStep } from "@brrr/Core/Schemas/Provenance/SplitProvenanceStep";

// Applies corporate action identifier relationships to financial events.
//
// RENAME: merges groupings along rename chains and normalizes to the sink identifier.
//
// SPLIT / REVERSE_SPLIT: a corporate action changes the instrument identifier (e.g. ISIN).
// We treat the relationship as FromIdentifier (old ISIN) → ToIdentifier (new ISIN).
// Only the old-ISIN (From) grouping is scaled for that split; the new ISIN (To) is not.
// We scale pre-effective-date quantities in the From grouping, then merge it into the To
// grouping so all events end up under the new identifier. Applied in EffectiveDate order.
// In a chain (e.g. ISIN.OLD.OLD → split → ISIN.OLD → split → ISIN), each split is applied
// in order: the oldest ISIN is scaled and merged into the next, then that grouping is scaled
// by the next split and merged again, so the original position is scaled by every ratio along
// the chain.
//
// Application order: RENAME first, then SPLIT/REVERSE_SPLIT by EffectiveDate.
export class ApplyIdentifierRelationshipsService {
	public apply(
		events: FinancialEvents,
		changeTypesToApply: IdentifierChangeType[],
	): FinancialEvents {
		let current = events;

		if (changeTypesToApply.includes(IdentifierChangeType.RENAME)) {
			current = this.applyRename(current);
		}

		const relsForSplits = current.identifierRelationships.filter(
			(r): r is IdentifierRelationshipSplit =>
				r instanceof IdentifierRelationshipSplit && changeTypesToApply.includes(r.changeType),
		);

		for (const rel of [...relsForSplits].sort(
			(a, b) => a.effectiveDate.toMillis() - b.effectiveDate.toMillis(),
		)) {
			current = this.applySplitOrReverseSplit(current, rel);
		}

		return current;
	}

	private applyRename(events: FinancialEvents): FinancialEvents {
		const rels = events.identifierRelationships.filter(
			(r) => r.changeType === IdentifierChangeType.RENAME,
		);
		if (rels.length === 0) return events;

		const pairs = rels.map((r) => [r.fromIdentifier, r.toIdentifier] as const);

		const resolveSink = (identifier: FinancialIdentifier): FinancialIdentifier => {
			for (const [fromId, toId] of pairs) {
				if (fromId.isTheSameAs(identifier)) return resolveSink(toId);
			}
			return identifier;
		};

		const idToSink = new Map<FinancialIdentifier, FinancialIdentifier>();
		for (const r of rels) {
			idToSink.set(r.fromIdentifier, resolveSink(r.fromIdentifier));
			idToSink.set(r.toIdentifier, resolveSink(r.toIdentifier));
		}

		const findSink = (identifier: FinancialIdentifier): FinancialIdentifier | null => {
			for (const [node, sink] of idToSink) {
				if (node.sameInstrumentByIsin(identifier) || sink.sameInstrumentByIsin(identifier)) {
					return sink;
				}
			}
			return null;
		};

		const notAffected: FinancialGrouping[] = [];
		const bySink = new Map<
			FinancialIdentifierKey,
			{ sink: FinancialIdentifier; groupings: FinancialGrouping[] }
		>();

		for (const g of events.groupings) {
			const sink = findSink(g.financialIdentifier);
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
		const sinkToProvenance = new Map<FinancialIdentifierKey, AnyProvenanceStep[]>();
		for (const r of rels) {
			const sink = resolveSink(r.toIdentifier);
			const key = sink.toKey();
			const step = new RenameProvenanceStep({
				fromIdentifier: r.fromIdentifier,
				toIdentifier: r.toIdentifier,
				changeType: r.changeType,
				effectiveDate: r.effectiveDate,
			});
			const existing = sinkToProvenance.get(key) ?? [];
			// Avoid duplicates
			if (
				!existing.some(
					(s) =>
						s.fromIdentifier.isTheSameAs(step.fromIdentifier) &&
						s.toIdentifier.isTheSameAs(step.toIdentifier),
				)
			) {
				existing.push(step);
			}
			sinkToProvenance.set(key, existing);
		}

		const merged = [...bySink.values()].map(({ sink, groupings }) =>
			this.mergeGroupings(sink, groupings, sinkToProvenance.get(sink.toKey()) ?? []),
		);

		return new FinancialEvents({
			groupings: [...notAffected, ...merged],
			identifierRelationships: events.identifierRelationships,
		});
	}

	private applySplitOrReverseSplit(
		events: FinancialEvents,
		relationship: IdentifierRelationshipSplit,
	): FinancialEvents {
		if (relationship.quantityBefore === 0) return events;
		const ratio = relationship.quantityAfter / relationship.quantityBefore;

		const fromGrouping =
			events.groupings.find((g) =>
				relationship.fromIdentifier.sameInstrumentByIsin(g.financialIdentifier),
			) ?? null;
		if (!fromGrouping) return events;

		const scaledTrades: TradeEventStock[] = [];
		for (const t of fromGrouping.stockTrades) {
			if (!(t.date < relationship.effectiveDate)) {
				scaledTrades.push(t);
				continue;
			}

			const m = t.exchangedMoney;
			const step = new SplitProvenanceStep({
				fromIdentifier: relationship.fromIdentifier,
				toIdentifier: relationship.toIdentifier,
				changeType: relationship.changeType,
				effectiveDate: relationship.effectiveDate,
				quantityBefore: m.quantity,
				quantityAfter: m.quantity * ratio,
				beforeQuantity: m.quantity,
				beforeTradePrice: m.priceInBase,
			});

			scaledTrades.push(scaleTradeForSplit(t, ratio, step));
		}

		const scaledLots: TaxLotStock[] = [];
		for (const lot of fromGrouping.stockTaxLots) {
			if (lot.acquired.date < relationship.effectiveDate) {
				const step = new SplitProvenanceStep({
					fromIdentifier: relationship.fromIdentifier,
					toIdentifier: relationship.toIdentifier,
					changeType: relationship.changeType,
					effectiveDate: relationship.effectiveDate,
					quantityBefore: relationship.quantityBefore,
					quantityAfter: relationship.quantityAfter,
					beforeQuantity: lot.quantity,
				});
				scaledLots.push(scaleLotForSplit(lot, ratio, step));
			} else {
				scaledLots.push(lot);
			}
		}

		const splitStep = new SplitProvenanceStep({
			fromIdentifier: relationship.fromIdentifier,
			toIdentifier: relationship.toIdentifier,
			changeType: relationship.changeType,
			effectiveDate: relationship.effectiveDate,
			quantityBefore: relationship.quantityBefore,
			quantityAfter: relationship.quantityAfter,
		});

		const scaledFrom = new FinancialGrouping({
			...fromGrouping,
			stockTrades: scaledTrades,
			stockTaxLots: scaledLots,
			provenance: [...fromGrouping.provenance, splitStep],
		});

		const toGrouping =
			events.groupings.find(
				(g) =>
					g !== fromGrouping &&
					relationship.toIdentifier.sameInstrumentByIsin(g.financialIdentifier),
			) ?? null;

		const sources = toGrouping !== null ? [scaledFrom, toGrouping] : [scaledFrom];
		const mergedGrouping = this.mergeGroupings(
			relationship.toIdentifier,
			sources,
			sources.flatMap((g) => g.provenance),
		);

		const other = events.groupings.filter((g) => g !== fromGrouping && g !== toGrouping);
		return new FinancialEvents({
			groupings: [...other, mergedGrouping],
			identifierRelationships: events.identifierRelationships,
		});
	}

	private mergeGroupings(
		properId: FinancialIdentifier,
		groupings: FinancialGrouping[],
		groupingProvenance: AnyProvenanceStep[],
	): FinancialGrouping {
		const first = groupings[0];

		return new FinancialGrouping({
			financialIdentifier: properId,
			countryOfOrigin: first.countryOfOrigin,
			underlyingCategory: first.underlyingCategory,
			stockTrades: groupings.flatMap((g) => g.stockTrades),
			stockTaxLots: groupings.flatMap((g) => g.stockTaxLots),
			derivativeGroupings: groupings.flatMap((g) =>
				g.derivativeGroupings.map(
					(dg) =>
						new DerivativeGrouping({
							financialIdentifier: properId,
							derivativeTrades: dg.derivativeTrades,
							derivativeTaxLots: dg.derivativeTaxLots,
							provenance: dg.provenance,
						}),
				),
			),
			cashTransactions: groupings.flatMap((g) => g.cashTransactions),
			provenance: groupingProvenance,
		});
	}
}

// A split never changes a trade in place: it builds the trade as it reads after the split, with
// the step recording the quantity and price it had before.
function scaleTradeForSplit(
	trade: TradeEventStock,
	ratio: number,
	step: SplitProvenanceStep,
): TradeEventStock {
	const scaled = {
		exchangedMoney: new ExchangedMoney({
			...trade.exchangedMoney,
			quantity: trade.exchangedMoney.quantity * ratio,
			priceInBase: trade.exchangedMoney.priceInBase * (1 / ratio),
		}),
		provenance: [...trade.provenance, step],
	};
	if (trade instanceof TradeEventStockAcquired) {
		return new TradeEventStockAcquired({ ...trade, ...scaled });
	}
	return new TradeEventStockSold({ ...trade, ...scaled });
}

function scaleLotForSplit(lot: TaxLotStock, ratio: number, step: SplitProvenanceStep): TaxLotStock {
	return new TaxLot({
		...lot,
		quantity: lot.quantity * ratio,
		provenance: [...lot.provenance, step],
	});
}
