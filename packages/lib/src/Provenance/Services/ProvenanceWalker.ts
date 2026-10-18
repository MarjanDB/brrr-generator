import type { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import type { ProvenanceDrop } from "@brrr/Provenance/Models/ProvenanceDrop";
import type { ProvenanceEdge } from "@brrr/Provenance/Models/ProvenanceEdge";
import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { ProvenanceSlice } from "@brrr/Provenance/Models/ProvenanceSlice";
import type { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";

enum WalkDirection {
	UP = "UP",
	DOWN = "DOWN",
}

// Reads a provenance graph: one step at a time, or a whole walk up to where something came from
// or down to where it went. Built once per graph, so every walk follows prepared adjacency lists.
export class ProvenanceWalker {
	private readonly allNodes: ProvenanceNode[];
	private readonly nodeSet: Set<ProvenanceNode>;
	private readonly allDrops: ProvenanceDrop[];
	private readonly incoming = new Map<ProvenanceNode, ProvenanceEdge[]>();
	private readonly outgoing = new Map<ProvenanceNode, ProvenanceEdge[]>();
	private readonly dropsByNode = new Map<ProvenanceNode, ProvenanceDrop[]>();

	public constructor(graph: ProvenanceGraph, ignoring: ProvenanceChange[] = []) {
		this.allNodes = graph.nodes();
		this.nodeSet = new Set(this.allNodes);
		this.allDrops = graph.drops();
		for (const edge of graph.edges()) {
			if (ignoring.includes(edge.change)) {
				continue;
			}
			this.append(this.outgoing, edge.from, edge);
			this.append(this.incoming, edge.to, edge);
		}
		for (const drop of this.allDrops) {
			this.append(this.dropsByNode, drop.node, drop);
		}
	}

	public inputs(): ProvenanceNode[] {
		return this.allNodes.filter((node) => node.kind === ProvenanceNodeKind.FILE);
	}

	public up(node: ProvenanceNode): ProvenanceSlice {
		return this.walk(node, WalkDirection.UP);
	}

	public down(node: ProvenanceNode): ProvenanceSlice {
		return this.walk(node, WalkDirection.DOWN);
	}

	public parents(node: ProvenanceNode): ProvenanceEdge[] {
		this.assertKnown(node);
		return [...(this.incoming.get(node) ?? [])];
	}

	public children(node: ProvenanceNode): ProvenanceEdge[] {
		this.assertKnown(node);
		return [...(this.outgoing.get(node) ?? [])];
	}

	public dropsOf(node: ProvenanceNode): ProvenanceDrop[] {
		this.assertKnown(node);
		return [...(this.dropsByNode.get(node) ?? [])];
	}

	public drops(): ProvenanceDrop[] {
		return [...this.allDrops];
	}

	private walk(start: ProvenanceNode, direction: WalkDirection): ProvenanceSlice {
		this.assertKnown(start);
		const adjacency = direction === WalkDirection.UP ? this.incoming : this.outgoing;
		const nodes: ProvenanceNode[] = [start];
		const seenNodes = new Set<ProvenanceNode>([start]);
		const edges: ProvenanceEdge[] = [];
		const seenEdges = new Set<ProvenanceEdge>();
		for (let index = 0; index < nodes.length; index++) {
			for (const edge of adjacency.get(nodes[index]) ?? []) {
				if (!seenEdges.has(edge)) {
					seenEdges.add(edge);
					edges.push(edge);
				}
				const next = direction === WalkDirection.UP ? edge.from : edge.to;
				if (!seenNodes.has(next)) {
					seenNodes.add(next);
					nodes.push(next);
				}
			}
		}
		const drops = nodes.flatMap((node) => this.dropsByNode.get(node) ?? []);
		return new ProvenanceSlice({ nodes, edges, drops });
	}

	private append<Value>(
		map: Map<ProvenanceNode, Value[]>,
		node: ProvenanceNode,
		value: Value,
	): void {
		const existing = map.get(node);
		if (existing === undefined) {
			map.set(node, [value]);
		} else {
			existing.push(value);
		}
	}

	private assertKnown(node: ProvenanceNode): void {
		if (!this.nodeSet.has(node)) {
			throw new Error("Provenance: node is not in this graph");
		}
	}
}
