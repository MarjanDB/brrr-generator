import type { ProvenanceNode } from "@brrr/lib";
import { MarkState } from "~/download/timeline/MarkState";

// `lit` is the set of nodes in the chain the user picked, or null when none is picked.
export function markStateOf(
	node: ProvenanceNode,
	focus: ProvenanceNode,
	lit: ReadonlySet<ProvenanceNode> | null,
): MarkState {
	if (node === focus) {
		return MarkState.FOCUSED;
	}
	if (lit === null) {
		return MarkState.NORMAL;
	}
	return lit.has(node) ? MarkState.LIT : MarkState.DIMMED;
}
