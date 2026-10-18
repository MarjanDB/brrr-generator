import type { ProvenanceField, ProvenanceNode } from "@brrr/lib";

// A fact a stage recorded on a node, or null when that node has none of it.
export function fieldOf(node: ProvenanceNode, field: ProvenanceField): string | null {
	return node.fields[field] ?? null;
}
