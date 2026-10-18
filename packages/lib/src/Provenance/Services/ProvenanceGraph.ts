import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import type { DropReason } from "@brrr/Provenance/Models/DropReason";
import type { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceDrop } from "@brrr/Provenance/Models/ProvenanceDrop";
import { ProvenanceEdge } from "@brrr/Provenance/Models/ProvenanceEdge";
import {
	ProvenanceNodeId,
	type ProvenanceStage,
} from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";
import type { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { ProvenanceWarning } from "@brrr/Provenance/Models/ProvenanceWarning";

export type ProvenanceGraphArgs = {
	parent: ProvenanceGraph | null;
};

// What each stage made from what, during one run. Nodes are keyed by the objects the stages
// record. A report records into a layer of its import's graph; once a graph has layers it is
// sealed, so a layer's ids can safely continue after its parent's.
export class ProvenanceGraph implements IProvenanceRecorder {
	private readonly parent: ProvenanceGraph | null;
	// How many nodes come before this graph's own: the parent can't grow once it has a layer.
	private readonly parentNodeCount: number;
	private readonly subjects = new Map<object, ProvenanceNode>();
	private readonly ownNodes: ProvenanceNode[] = [];
	private readonly ownEdges: ProvenanceEdge[] = [];
	private readonly ownDrops: ProvenanceDrop[] = [];
	private readonly ownWarnings: ProvenanceWarning[] = [];
	private sealed = false;

	public constructor(args: ProvenanceGraphArgs) {
		this.parent = args.parent;
		this.parentNodeCount = args.parent === null ? 0 : args.parent.nodes().length;
	}

	public layer(): ProvenanceGraph {
		this.sealed = true;
		return new ProvenanceGraph({ parent: this });
	}

	public node(
		subject: object,
		kind: ProvenanceNodeKind,
		label: string,
		fields: Record<string, string>,
	): void {
		this.assertOpen();
		if (this.find(subject) !== null) {
			return;
		}
		const position = this.parentNodeCount + this.ownNodes.length + 1;
		const node = new ProvenanceNode({
			id: ProvenanceNodeId.Schema.parse(`n${position}`),
			kind,
			label,
			fields,
		});
		this.subjects.set(subject, node);
		this.ownNodes.push(node);
	}

	public derive(
		from: object[],
		to: object,
		change: ProvenanceChange,
		by: ProvenanceStage,
		detail: string | null,
	): void {
		this.assertOpen();
		const target = this.nodeOf(to);
		for (const source of from) {
			this.ownEdges.push(
				new ProvenanceEdge({ from: this.nodeOf(source), to: target, change, by, detail }),
			);
		}
	}

	public drop(
		subject: object,
		reason: DropReason,
		by: ProvenanceStage,
		detail: string | null,
	): void {
		this.assertOpen();
		this.ownDrops.push(new ProvenanceDrop({ node: this.nodeOf(subject), reason, by, detail }));
	}

	public warn(subject: object, by: ProvenanceStage, detail: string): void {
		this.assertOpen();
		this.ownWarnings.push(new ProvenanceWarning({ node: this.nodeOf(subject), by, detail }));
	}

	public nodeOf(subject: object): ProvenanceNode {
		const node = this.find(subject);
		if (node === null) {
			throw new Error("Provenance: subject was never recorded as a node");
		}
		return node;
	}

	public nodes(): ProvenanceNode[] {
		return [...(this.parent?.nodes() ?? []), ...this.ownNodes];
	}

	public edges(): ProvenanceEdge[] {
		return [...(this.parent?.edges() ?? []), ...this.ownEdges];
	}

	public drops(): ProvenanceDrop[] {
		return [...(this.parent?.drops() ?? []), ...this.ownDrops];
	}

	public warnings(): ProvenanceWarning[] {
		return [...(this.parent?.warnings() ?? []), ...this.ownWarnings];
	}

	private find(subject: object): ProvenanceNode | null {
		return this.subjects.get(subject) ?? this.parent?.find(subject) ?? null;
	}

	private assertOpen(): void {
		if (this.sealed) {
			throw new Error("Provenance: this graph has layers; record into a layer instead");
		}
	}
}
