import { ExchangedMoney } from "@brrr/Core/Models/Events/ExchangedMoney";
import type { TradeEventStock } from "@brrr/Core/Models/Events/Stock/TradeEventStock";
import { TradeEventStockAcquired } from "@brrr/Core/Models/Events/Stock/TradeEventStockAcquired";
import { TradeEventStockSold } from "@brrr/Core/Models/Events/Stock/TradeEventStockSold";
import { FinancialEvents } from "@brrr/Core/Models/FinancialEvents";
import { DerivativeGrouping } from "@brrr/Core/Models/Groupings/DerivativeGrouping";
import { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import { IdentifierChangeType } from "@brrr/Core/Models/IdentifierRelationships/IdentifierChangeType";
import { IdentifierRelationshipSplit } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationshipSplit";
import type { FinancialIdentifierKey } from "@brrr/Core/Models/Identifiers";
import { AssetClass } from "@brrr/Core/Models/Instrument/AssetClass";
import type { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import { TaxLot, type TaxLotStock } from "@brrr/Core/Models/Lots/TaxLot";
import {
	recordDerivativeGroupingMembers,
	recordGroupingMembers,
} from "@brrr/Core/Utils/GroupingMembers";
import { ProvenanceLabels } from "@brrr/Core/Utils/ProvenanceLabels";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";

const STAGE = ProvenanceStage.Schema.parse("ApplyIdentifierRelationshipsService");

// What a merged grouping records about how it came to be.
type MergeRecord = {
	change: ProvenanceChange;
	relationships: object[];
	detail: string | null;
};

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
		provenance: IProvenanceRecorder,
	): FinancialEvents {
		let current = events;

		if (changeTypesToApply.includes(IdentifierChangeType.RENAME)) {
			current = this.applyRename(current, provenance);
		}

		const relsForSplits = current.identifierRelationships.filter(
			(r): r is IdentifierRelationshipSplit =>
				r instanceof IdentifierRelationshipSplit && changeTypesToApply.includes(r.changeType),
		);

		for (const rel of [...relsForSplits].sort(
			(a, b) => a.effectiveDate.toMillis() - b.effectiveDate.toMillis(),
		)) {
			current = this.applySplitOrReverseSplit(current, rel, provenance);
		}

		return current;
	}

	private applyRename(events: FinancialEvents, provenance: IProvenanceRecorder): FinancialEvents {
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

		// The renames behind each sink
		const sinkToRelationships = new Map<FinancialIdentifierKey, object[]>();
		for (const r of rels) {
			const key = resolveSink(r.toIdentifier).toKey();
			sinkToRelationships.set(key, [...(sinkToRelationships.get(key) ?? []), r]);
		}

		const merged = [...bySink.values()].map(({ sink, groupings }) =>
			this.mergeGroupings(sink, groupings, provenance, {
				change: ProvenanceChange.RENAMED,
				relationships: sinkToRelationships.get(sink.toKey()) ?? [],
				detail: null,
			}),
		);

		return new FinancialEvents({
			groupings: [...notAffected, ...merged],
			identifierRelationships: events.identifierRelationships,
		});
	}

	private applySplitOrReverseSplit(
		events: FinancialEvents,
		relationship: IdentifierRelationshipSplit,
		provenance: IProvenanceRecorder,
	): FinancialEvents {
		if (relationship.quantityBefore === 0) return events;
		const ratio = relationship.quantityAfter / relationship.quantityBefore;

		const fromGrouping =
			events.groupings.find((g) =>
				relationship.fromIdentifier.sameInstrumentByIsin(g.financialIdentifier),
			) ?? null;
		if (!fromGrouping) return events;

		const ticker = fromGrouping.financialIdentifier.ticker;
		const splitDetail = `${relationship.quantityBefore} → ${relationship.quantityAfter}`;

		const scaledTrades: TradeEventStock[] = [];
		for (const t of fromGrouping.stockTrades) {
			if (!(t.date < relationship.effectiveDate)) {
				scaledTrades.push(t);
				continue;
			}

			const scaledTrade = scaleTradeForSplit(t, ratio);
			provenance.node(
				scaledTrade,
				ProvenanceNodeKind.EVENT,
				ProvenanceLabels.trade(
					AssetClass.STOCK,
					scaledTrade instanceof TradeEventStockAcquired,
					scaledTrade.id,
					scaledTrade.exchangedMoney.quantity,
					ticker,
				),
				{},
			);
			provenance.derive([t, relationship], scaledTrade, ProvenanceChange.SPLIT, STAGE, splitDetail);
			scaledTrades.push(scaledTrade);
		}

		const scaledLots: TaxLotStock[] = [];
		for (const lot of fromGrouping.stockTaxLots) {
			if (lot.acquired.date < relationship.effectiveDate) {
				const scaledLot = scaleLotForSplit(lot, ratio);
				provenance.node(
					scaledLot,
					ProvenanceNodeKind.LOT,
					ProvenanceLabels.lot(scaledLot.id, scaledLot.quantity, ticker),
					{},
				);
				provenance.derive(
					[lot, relationship],
					scaledLot,
					ProvenanceChange.SPLIT,
					STAGE,
					splitDetail,
				);
				scaledLots.push(scaledLot);
			} else {
				scaledLots.push(lot);
			}
		}

		const scaledFrom = new FinancialGrouping({
			...fromGrouping,
			stockTrades: scaledTrades,
			stockTaxLots: scaledLots,
		});

		provenance.node(
			scaledFrom,
			ProvenanceNodeKind.GROUPING,
			ProvenanceLabels.grouping(
				false,
				scaledFrom.financialIdentifier.isin,
				scaledFrom.financialIdentifier.ticker,
			),
			{},
		);
		provenance.derive(
			[fromGrouping, relationship],
			scaledFrom,
			ProvenanceChange.SPLIT,
			STAGE,
			splitDetail,
		);
		recordGroupingMembers(provenance, scaledFrom, STAGE);

		const toGrouping =
			events.groupings.find(
				(g) =>
					g !== fromGrouping &&
					relationship.toIdentifier.sameInstrumentByIsin(g.financialIdentifier),
			) ?? null;

		const sources = toGrouping !== null ? [scaledFrom, toGrouping] : [scaledFrom];
		const mergedGrouping = this.mergeGroupings(relationship.toIdentifier, sources, provenance, {
			change: ProvenanceChange.SPLIT,
			relationships: [relationship],
			detail: splitDetail,
		});

		const other = events.groupings.filter((g) => g !== fromGrouping && g !== toGrouping);
		return new FinancialEvents({
			groupings: [...other, mergedGrouping],
			identifierRelationships: events.identifierRelationships,
		});
	}

	private mergeGroupings(
		properId: FinancialIdentifier,
		groupings: FinancialGrouping[],
		provenance: IProvenanceRecorder,
		record: MergeRecord,
	): FinancialGrouping {
		const first = groupings[0];

		const merged = new FinancialGrouping({
			financialIdentifier: properId,
			countryOfOrigin: first.countryOfOrigin,
			underlyingCategory: first.underlyingCategory,
			stockTrades: groupings.flatMap((g) => g.stockTrades),
			stockTaxLots: groupings.flatMap((g) => g.stockTaxLots),
			derivativeGroupings: groupings.flatMap((g) =>
				g.derivativeGroupings.map((dg) => {
					const rebuilt = new DerivativeGrouping({
						financialIdentifier: properId,
						derivativeTrades: dg.derivativeTrades,
						derivativeTaxLots: dg.derivativeTaxLots,
					});
					provenance.node(
						rebuilt,
						ProvenanceNodeKind.GROUPING,
						ProvenanceLabels.grouping(true, properId.isin, properId.ticker),
						{},
					);
					provenance.derive(
						[dg, ...record.relationships],
						rebuilt,
						record.change,
						STAGE,
						record.detail,
					);
					recordDerivativeGroupingMembers(provenance, rebuilt, STAGE);
					return rebuilt;
				}),
			),
			cashTransactions: groupings.flatMap((g) => g.cashTransactions),
		});
		provenance.node(
			merged,
			ProvenanceNodeKind.GROUPING,
			ProvenanceLabels.grouping(false, properId.isin, properId.ticker),
			{},
		);
		provenance.derive(
			[...groupings, ...record.relationships],
			merged,
			record.change,
			STAGE,
			record.detail,
		);
		recordGroupingMembers(provenance, merged, STAGE);
		return merged;
	}
}

// A split never changes a trade in place: it builds the trade the way it reads after the split.
// The caller records it, made from the original and the split.
function scaleTradeForSplit(trade: TradeEventStock, ratio: number): TradeEventStock {
	const scaled = {
		exchangedMoney: new ExchangedMoney({
			...trade.exchangedMoney,
			quantity: trade.exchangedMoney.quantity * ratio,
			priceInBase: trade.exchangedMoney.priceInBase * (1 / ratio),
		}),
	};
	if (trade instanceof TradeEventStockAcquired) {
		return new TradeEventStockAcquired({ ...trade, ...scaled });
	}
	return new TradeEventStockSold({ ...trade, ...scaled });
}

function scaleLotForSplit(lot: TaxLotStock, ratio: number): TaxLotStock {
	return new TaxLot({
		...lot,
		quantity: lot.quantity * ratio,
	});
}
