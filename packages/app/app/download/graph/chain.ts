import type { ProvenanceNode } from "@brrr/lib";
import {
	type GraphChain,
	type GraphLayout,
	type GraphLayoutEdge,
	type GraphLayoutNode,
	GraphNodeKind,
} from "~/types/provenanceGraph";

// Everything on the path through a node: what it came from and what it went into, over the drawn
// edges only. Stubs and stacks are never in a chain.
export function chainOfNode(layout: GraphLayout, node: GraphLayoutNode): GraphChain {
	return chainOf(layout, [node], [node]);
}

// Everything on the path through an edge: what its start came from and what its end went into.
export function chainOfEdge(layout: GraphLayout, edge: GraphLayoutEdge): GraphChain {
	return chainOf(layout, [edge.from], [edge.to]);
}

function chainOf(
	layout: GraphLayout,
	upFrom: GraphLayoutNode[],
	downFrom: GraphLayoutNode[],
): GraphChain {
	const drawn = layout.edges.filter((edge) => !edge.isStub);
	const nodes = new Set<GraphLayoutNode>([
		...walk(upFrom, (node) => drawn.filter((edge) => edge.to === node).map((edge) => edge.from)),
		...walk(downFrom, (node) => drawn.filter((edge) => edge.from === node).map((edge) => edge.to)),
	]);
	return {
		nodes,
		edges: new Set(drawn.filter((edge) => nodes.has(edge.from) && nodes.has(edge.to))),
		sources: new Set([...nodes].flatMap(sourcesOf)),
	};
}

function walk(
	start: GraphLayoutNode[],
	next: (node: GraphLayoutNode) => GraphLayoutNode[],
): GraphLayoutNode[] {
	const seen = new Set<GraphLayoutNode>(start);
	const pending = [...start];
	for (const node of pending) {
		for (const neighbour of next(node)) {
			if (!seen.has(neighbour)) {
				seen.add(neighbour);
				pending.push(neighbour);
			}
		}
	}
	return pending;
}

// The recorded nodes a drawn node stands for.
function sourcesOf(layoutNode: GraphLayoutNode): ProvenanceNode[] {
	const node = layoutNode.node;
	if (node.pair !== null) {
		return [
			node.pair.lot,
			node.pair.acquired.leg,
			node.pair.sold.leg,
			node.pair.acquired.line,
			node.pair.sold.line,
		].filter((member): member is ProvenanceNode => member !== null);
	}
	if (node.kind === GraphNodeKind.DROP || node.source === null) {
		return [];
	}
	return [node.source];
}
