import type { FocusState } from "~/download/graph/FocusState";
import type { StackKey } from "~/download/graph/GraphIdentifiers";
import type { GraphNode } from "~/download/graph/GraphNode";

export type InteractionResultArgs = {
	focusState: FocusState;
	expanded: ReadonlySet<StackKey>;
	popoverNode: GraphNode | null;
};

// What the graph shows after a click.
export class InteractionResult {
	public readonly focusState: FocusState;
	// The stacks that are spread out.
	public readonly expanded: ReadonlySet<StackKey>;
	// The node whose popover is open; null when none is.
	public readonly popoverNode: GraphNode | null;

	public constructor(args: InteractionResultArgs) {
		this.focusState = args.focusState;
		this.expanded = args.expanded;
		this.popoverNode = args.popoverNode;
	}
}
