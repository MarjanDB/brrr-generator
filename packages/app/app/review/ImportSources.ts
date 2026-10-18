import {
	ProvenanceChange,
	type ProvenanceGraph,
	type ProvenanceNode,
	ProvenanceNodeKind,
	ProvenanceWalker,
} from "@brrr/lib";
import { RowSource } from "~/review/RowSource";
import { RowSources } from "~/review/RowSources";

// Where an import's events came from, read from its provenance graph. Built once per import.
export class ImportSources {
	private readonly graph: ProvenanceGraph;
	// Finds the one row an event was taken from: copies counted into it are not followed.
	private readonly lineage: ProvenanceWalker;
	// Also finds the copies of that row in other exports.
	private readonly withCopies: ProvenanceWalker;
	private readonly positions = new Map<ProvenanceNode, number>();
	private readonly records: ProvenanceNode[];

	public constructor(graph: ProvenanceGraph) {
		this.graph = graph;
		this.lineage = new ProvenanceWalker(graph, [
			ProvenanceChange.GROUPED,
			ProvenanceChange.DEDUPLICATED,
		]);
		this.withCopies = new ProvenanceWalker(graph, [ProvenanceChange.GROUPED]);
		const nodes = graph.nodes();
		nodes.forEach((node, index) => {
			this.positions.set(node, index);
		});
		this.records = nodes.filter((node) => node.kind === ProvenanceNodeKind.RECORD);
	}

	// `subject` is a core event from the import's events.
	public of(subject: object): RowSources {
		return this.rowsOf(this.graph.nodeOf(subject));
	}

	public rowsOf(node: ProvenanceNode): RowSources {
		const taken = this.rowsAbove(this.lineage, node)[0];
		if (taken === undefined) {
			throw new Error("Provenance: no broker row behind this node");
		}
		const copies = this.rowsAbove(this.withCopies, node).filter((row) => row !== taken);
		return new RowSources({
			row: this.sourceOf(taken),
			alsoIn: copies.map((row) => this.sourceOf(row)),
		});
	}

	// Every broker row in the node's ancestry, itself included, in graph order.
	public behind(node: ProvenanceNode): RowSource[] {
		return this.rowsAbove(this.withCopies, node).map((row) => this.sourceOf(row));
	}

	// The records that were found in more than one export, with the row each was taken from.
	public merged(): RowSources[] {
		return this.records
			.filter((record) =>
				this.withCopies
					.parents(record)
					.some((edge) => edge.change === ProvenanceChange.DEDUPLICATED),
			)
			.map((record) => this.rowsOf(record));
	}

	private rowsAbove(walker: ProvenanceWalker, node: ProvenanceNode): ProvenanceNode[] {
		return walker
			.up(node)
			.nodes.filter((above) => above.kind === ProvenanceNodeKind.ROW)
			.sort((a, b) => this.positionOf(a) - this.positionOf(b));
	}

	private sourceOf(row: ProvenanceNode): RowSource {
		const file = this.lineage
			.parents(row)
			.map((edge) => edge.from)
			.find((parent) => parent.kind === ProvenanceNodeKind.FILE);
		if (file === undefined) {
			throw new Error("Provenance: broker row has no file");
		}
		return new RowSource({ row, fileName: file.label });
	}

	private positionOf(node: ProvenanceNode): number {
		return this.positions.get(node) ?? 0;
	}
}
