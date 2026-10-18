import { EDavkiProvenanceField, ProvenanceNodeKind, type ProvenanceWalker } from "@brrr/lib";
import { PopoverContent } from "~/download/graph/view/PopoverContent";
import { PopoverKind } from "~/download/graph/view/PopoverKind";
import { PopoverRow } from "~/download/graph/view/PopoverRow";
import { type GraphNode, GraphNodeKind } from "~/types/provenanceGraph";
import { edavkiFieldKeys } from "~/utils/i18nKeys";

// What the popover of a node lists: a broker row's attributes or a report line's values. Every
// other node has none.
export function popoverContentOf(node: GraphNode, walker: ProvenanceWalker): PopoverContent | null {
	const source = node.source;
	if (source === null) {
		return null;
	}
	switch (node.kind) {
		case GraphNodeKind.ROW: {
			const file = walker
				.up(source)
				.nodes.find((ancestor) => ancestor.kind === ProvenanceNodeKind.FILE);
			return new PopoverContent({
				kind: PopoverKind.ROW_ATTRIBUTES,
				title: node,
				rows: Object.entries(source.fields)
					.sort(([first], [second]) => first.localeCompare(second))
					.map(([name, value]) => new PopoverRow({ name, nameKey: null, value })),
				fromFile: file?.label ?? null,
			});
		}
		case GraphNodeKind.REPORT_LINE:
			return new PopoverContent({
				kind: PopoverKind.LINE_VALUES,
				title: node,
				rows: Object.values(EDavkiProvenanceField).flatMap((field) => {
					const value = source.fields[field];
					return value === undefined
						? []
						: [new PopoverRow({ name: field, nameKey: edavkiFieldKeys[field], value })];
				}),
				fromFile: null,
			});
		default:
			return null;
	}
}
