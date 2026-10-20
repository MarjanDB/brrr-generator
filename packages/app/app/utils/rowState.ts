import { MarkState } from "~/types/timeline";

// How a row of the tables under the timeline shows the focus, as the timeline does: the focused
// item's row and the rows it lights (the lots of a focused sale, the trades of a focused lot, the
// chain picked in the graph) look selected alike, tinted with a bar on their left. Only the focused
// item's row is current; its table scrolls to it, or to the first selected row when none is.
// `row-selected` is every list's selected look, and keeps its tint under the pointer.
const selectedClasses = "row-selected";

export type RowStateAttributes = {
	class: string;
	"aria-current": true | undefined;
	"data-selected": true | undefined;
};

export function rowStateAttributes(state: MarkState): RowStateAttributes {
	const selected = state === MarkState.FOCUSED || state === MarkState.LIT;
	return {
		class: selected ? selectedClasses : "",
		"aria-current": state === MarkState.FOCUSED ? true : undefined,
		"data-selected": selected ? true : undefined,
	};
}
