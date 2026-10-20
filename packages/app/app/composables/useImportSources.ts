import {
	ProvenanceChange,
	type ProvenanceGraph,
	type ProvenanceNode,
	ProvenanceNodeKind,
	ProvenanceWalker,
} from "@brrr/lib";
import type { ComputedRef, InjectionKey } from "vue";
import {
	type RowAttribute,
	type RowSource,
	RowSourceKind,
	type RowSources,
} from "~/types/importSources";

// Where an import's events came from, read from its provenance graph. Built once per import.
export type ImportSources = {
	// `subject` is a core event from the import's events.
	of(subject: object): RowSources;
	rowsOf(node: ProvenanceNode): RowSources;
	// Every broker row in the node's ancestry, itself included, in graph order.
	behind(node: ProvenanceNode): RowSource[];
	// The records that were found in more than one export, with the row each was taken from.
	merged: ComputedRef<RowSources[]>;
	// The attributes a row's popover lists first, in its kind's order. One the row lacks is skipped;
	// an empty one is kept.
	keyAttributesOf(row: ProvenanceNode, kind: RowSourceKind): RowAttribute[];
	// Every attribute of the row, by name in code-unit order.
	allAttributesOf(row: ProvenanceNode): RowAttribute[];
};

const importSourcesKey: InjectionKey<ImportSources> = Symbol("ImportSources");

// IBKR Flex Query attribute names, as the export spells them.
enum IbkrRowAttribute {
	TRADE_DATE = "tradeDate",
	BUY_SELL = "buySell",
	QUANTITY = "quantity",
	TRADE_PRICE = "tradePrice",
	CURRENCY = "currency",
	IB_COMMISSION = "ibCommission",
	TRANSACTION_ID = "transactionID",
	DATE_TIME = "dateTime",
	TYPE = "type",
	AMOUNT = "amount",
	DESCRIPTION = "description",
	ACTION_ID = "actionID",
}

// The attributes a row's popover lists first, in this order.
const keyAttributes: Record<RowSourceKind, IbkrRowAttribute[]> = {
	[RowSourceKind.TRADE]: [
		IbkrRowAttribute.TRADE_DATE,
		IbkrRowAttribute.BUY_SELL,
		IbkrRowAttribute.QUANTITY,
		IbkrRowAttribute.TRADE_PRICE,
		IbkrRowAttribute.CURRENCY,
		IbkrRowAttribute.IB_COMMISSION,
		IbkrRowAttribute.TRANSACTION_ID,
	],
	[RowSourceKind.CASH_TRANSACTION]: [
		IbkrRowAttribute.DATE_TIME,
		IbkrRowAttribute.TYPE,
		IbkrRowAttribute.AMOUNT,
		IbkrRowAttribute.CURRENCY,
		IbkrRowAttribute.DESCRIPTION,
		IbkrRowAttribute.ACTION_ID,
		IbkrRowAttribute.TRANSACTION_ID,
	],
};

function keyAttributesOf(row: ProvenanceNode, kind: RowSourceKind): RowAttribute[] {
	const attributes: RowAttribute[] = [];
	for (const name of keyAttributes[kind]) {
		const value = row.fields[name];
		if (value !== undefined) {
			attributes.push({ name, value });
		}
	}
	return attributes;
}

function allAttributesOf(row: ProvenanceNode): RowAttribute[] {
	return Object.entries(row.fields)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([name, value]) => ({ name, value }));
}

// Reads where the import's events came from, and hands it to every descendant. The walkers are
// computed, so a new graph rebuilds them.
export function provideImportSources(graph: () => ProvenanceGraph): ImportSources {
	// Finds the one row an event was taken from: copies counted into it are not followed.
	const lineage = computed(
		() => new ProvenanceWalker(graph(), [ProvenanceChange.GROUPED, ProvenanceChange.DEDUPLICATED]),
	);
	// Also finds the copies of that row in other exports.
	const withCopies = computed(() => new ProvenanceWalker(graph(), [ProvenanceChange.GROUPED]));
	const nodes = computed(() => graph().nodes());
	const positions = computed(() => {
		const positions = new Map<ProvenanceNode, number>();
		nodes.value.forEach((node, index) => {
			positions.set(node, index);
		});
		return positions;
	});
	const records = computed(() =>
		nodes.value.filter((node) => node.kind === ProvenanceNodeKind.RECORD),
	);

	function positionOf(node: ProvenanceNode): number {
		return positions.value.get(node) ?? 0;
	}

	function rowsAbove(walker: ProvenanceWalker, node: ProvenanceNode): ProvenanceNode[] {
		return walker
			.up(node)
			.nodes.filter((above) => above.kind === ProvenanceNodeKind.ROW)
			.sort((a, b) => positionOf(a) - positionOf(b));
	}

	function sourceOf(row: ProvenanceNode): RowSource {
		const file = lineage.value
			.parents(row)
			.map((edge) => edge.from)
			.find((parent) => parent.kind === ProvenanceNodeKind.FILE);
		if (file === undefined) {
			throw new Error("Provenance: broker row has no file");
		}
		return { row, fileName: file.label };
	}

	function rowsOf(node: ProvenanceNode): RowSources {
		const taken = rowsAbove(lineage.value, node)[0];
		if (taken === undefined) {
			throw new Error("Provenance: no broker row behind this node");
		}
		const copies = rowsAbove(withCopies.value, node).filter((row) => row !== taken);
		return {
			row: sourceOf(taken),
			alsoIn: copies.map((row) => sourceOf(row)),
		};
	}

	const sources: ImportSources = {
		of: (subject) => rowsOf(graph().nodeOf(subject)),
		rowsOf,
		behind: (node) => rowsAbove(withCopies.value, node).map((row) => sourceOf(row)),
		merged: computed(() =>
			records.value
				.filter((record) =>
					withCopies.value
						.parents(record)
						.some((edge) => edge.change === ProvenanceChange.DEDUPLICATED),
				)
				.map((record) => rowsOf(record)),
		),
		keyAttributesOf,
		allAttributesOf,
	};
	provide(importSourcesKey, sources);
	return sources;
}

// The import sources an ancestor provided.
export function useImportSources(): ImportSources {
	const sources = inject(importSourcesKey, null);
	if (sources === null) {
		throw new Error("useImportSources: no ancestor called provideImportSources");
	}
	return sources;
}
