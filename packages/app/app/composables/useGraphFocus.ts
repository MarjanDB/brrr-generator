import type { ProvenanceNode } from "@brrr/lib";
import type { ComputedRef, InjectionKey, Ref } from "vue";
import {
	type GraphChain,
	type GraphLayout,
	type GraphLayoutEdge,
	type GraphLayoutNode,
	GraphNodeKind,
} from "~/types/provenanceGraph";

// What the graph is centred on, where the user came from, and the chain they picked inside it.
export type GraphFocus = {
	// Null until `start` is called.
	node: Readonly<Ref<ProvenanceNode | null>>;
	// The nodes focused before this one, the most recent last.
	trail: Readonly<Ref<readonly ProvenanceNode[]>>;
	lit: Readonly<Ref<GraphChain | null>>;
	canGoBack: ComputedRef<boolean>;
	// Starts again from a node: no trail, nothing lit.
	start(node: ProvenanceNode): void;
	// Centres on another node; the old focus joins the trail unless it is the same node.
	refocus(node: ProvenanceNode): void;
	// Returns to the previous focus. With nothing to return to, the focus stays.
	back(): void;
	// Lights everything on the path through a node, or through an edge.
	lightNode(layout: GraphLayout, node: GraphLayoutNode): void;
	lightEdge(layout: GraphLayout, edge: GraphLayoutEdge): void;
	clearLight(): void;
	// The focus and the trail through a function, as when switching which steps are shown.
	remap(map: (node: ProvenanceNode) => ProvenanceNode): void;
};

const graphFocusKey: InjectionKey<GraphFocus> = Symbol("GraphFocus");

// Creates the focus of the download step's graph and hands it to every descendant. Every move
// but lighting clears the light.
export function provideGraphFocus(): GraphFocus {
	const node = shallowRef<ProvenanceNode | null>(null);
	const trail = shallowRef<readonly ProvenanceNode[]>([]);
	const lit = shallowRef<GraphChain | null>(null);

	const focus: GraphFocus = {
		node,
		trail,
		lit,
		canGoBack: computed(() => trail.value.length > 0),
		start: (next) => {
			node.value = next;
			trail.value = [];
			lit.value = null;
		},
		refocus: (next) => {
			if (node.value !== null && next !== node.value) {
				trail.value = [...trail.value, node.value];
			}
			node.value = next;
			lit.value = null;
		},
		back: () => {
			const previous = trail.value[trail.value.length - 1];
			if (previous !== undefined) {
				node.value = previous;
				trail.value = trail.value.slice(0, -1);
			}
			lit.value = null;
		},
		lightNode: (layout, layoutNode) => {
			lit.value = chainOf(layout, [layoutNode], [layoutNode]);
		},
		lightEdge: (layout, edge) => {
			lit.value = chainOf(layout, [edge.from], [edge.to]);
		},
		clearLight: () => {
			lit.value = null;
		},
		remap: (map) => {
			node.value = node.value === null ? null : map(node.value);
			trail.value = trail.value.map(map);
			lit.value = null;
		},
	};
	provide(graphFocusKey, focus);
	return focus;
}

// The focus an ancestor provided.
export function useGraphFocus(): GraphFocus {
	const focus = inject(graphFocusKey, null);
	if (focus === null) {
		throw new Error("useGraphFocus: no ancestor called provideGraphFocus");
	}
	return focus;
}

// Everything on the path from `upFrom` back and from `downFrom` on, over the main path's edges.
// The stubs and stacks hanging off it stay out, but a lit stub's own edge is walked, and a lit lot
// lights the trade on its other side, which a trade's graph draws as a stub after it: on the
// timeline a lot is a bar between both its trades.
function chainOf(
	layout: GraphLayout,
	upFrom: GraphLayoutNode[],
	downFrom: GraphLayoutNode[],
): GraphChain {
	const starts = new Set([...upFrom, ...downFrom]);
	const walked = layout.edges.filter(
		(edge) =>
			!edge.isStub ||
			(edge.from.isStub && starts.has(edge.from)) ||
			(edge.to.isStub && starts.has(edge.to)),
	);
	const nodes = new Set<GraphLayoutNode>([
		...walk(upFrom, (node) => walked.filter((edge) => edge.to === node).map((edge) => edge.from)),
		...walk(downFrom, (node) => walked.filter((edge) => edge.from === node).map((edge) => edge.to)),
	]);
	for (const edge of layout.edges) {
		if (edge.isStub && edge.from.node.kind === GraphNodeKind.PAIR && nodes.has(edge.from)) {
			nodes.add(edge.to);
		}
	}
	return {
		nodes,
		edges: new Set(layout.edges.filter((edge) => nodes.has(edge.from) && nodes.has(edge.to))),
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
