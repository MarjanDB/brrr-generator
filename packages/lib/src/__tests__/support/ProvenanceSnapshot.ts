import type { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";

function withDetail(text: string, detail: string | null): string {
	return detail === null ? text : `${text} (${detail})`;
}

// A graph as readable text, for golden files: each node with the nodes it was made from, then
// the drops and the warnings.
export function renderProvenance(graph: ProvenanceGraph): string {
	const walker = new ProvenanceWalker(graph);
	const lines: string[] = [];
	for (const node of graph.nodes()) {
		lines.push(`${node.id} ${node.kind} ${node.label}`);
		for (const edge of walker.parents(node)) {
			lines.push(withDetail(`  ← ${edge.from.id} ${edge.change} by ${edge.by}`, edge.detail));
		}
	}
	lines.push("", "Dropped:");
	const drops = graph.drops();
	if (drops.length === 0) {
		lines.push("(none)");
	}
	for (const drop of drops) {
		lines.push(withDetail(`${drop.node.id} ${drop.reason} by ${drop.by}`, drop.detail));
	}
	lines.push("", "Warnings:");
	const warnings = graph.warnings();
	if (warnings.length === 0) {
		lines.push("(none)");
	}
	for (const warning of warnings) {
		lines.push(`${warning.node.id} by ${warning.by}: ${warning.detail}`);
	}
	lines.push("");
	return lines.join("\n");
}
