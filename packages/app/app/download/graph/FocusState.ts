import type { ProvenanceNode } from "@brrr/lib";
import type { GraphChain } from "~/download/graph/GraphChain";

export type FocusStateArgs = {
	focus: ProvenanceNode;
	trail: readonly ProvenanceNode[];
	lit: GraphChain | null;
};

// What the graph is centred on, where the user came from, and the chain they picked inside it.
// Every transition returns a new state; none changes the one it is called on.
export class FocusState {
	public readonly focus: ProvenanceNode;
	// The nodes focused before this one, the most recent last.
	public readonly trail: readonly ProvenanceNode[];
	public readonly lit: GraphChain | null;

	public constructor(args: FocusStateArgs) {
		this.focus = args.focus;
		this.trail = args.trail;
		this.lit = args.lit;
	}

	public static start(focus: ProvenanceNode): FocusState {
		return new FocusState({ focus, trail: [], lit: null });
	}

	// Centres on another node; the old focus joins the trail unless it is the same node.
	public refocus(next: ProvenanceNode): FocusState {
		return new FocusState({
			focus: next,
			trail: next === this.focus ? this.trail : [...this.trail, this.focus],
			lit: null,
		});
	}

	// Returns to the previous focus. With nothing to return to, the focus stays.
	public back(): FocusState {
		const previous = this.trail[this.trail.length - 1];
		if (previous === undefined) {
			return new FocusState({ focus: this.focus, trail: this.trail, lit: null });
		}
		return new FocusState({ focus: previous, trail: this.trail.slice(0, -1), lit: null });
	}

	public canGoBack(): boolean {
		return this.trail.length > 0;
	}

	public light(chain: GraphChain): FocusState {
		return new FocusState({ focus: this.focus, trail: this.trail, lit: chain });
	}

	public clearLight(): FocusState {
		return new FocusState({ focus: this.focus, trail: this.trail, lit: null });
	}

	// The focus and the trail through a function, as when switching which steps are shown.
	public remap(map: (node: ProvenanceNode) => ProvenanceNode): FocusState {
		return new FocusState({ focus: map(this.focus), trail: this.trail.map(map), lit: null });
	}
}
