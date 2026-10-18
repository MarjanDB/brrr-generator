import type { ProvenanceDrop, ProvenanceEventKind } from "@brrr/lib";
import type { CaptionSegmentKind } from "~/download/graph/CaptionSegmentKind";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";

export type CaptionSegmentArgs = {
	kind: CaptionSegmentKind;
	node: GraphLayoutNode | null;
	count: number | null;
	opposite: ProvenanceEventKind | null;
	drop: ProvenanceDrop | null;
};

// One part of the line above the graph. The view writes the sentence from i18n.
export class CaptionSegment {
	public readonly kind: CaptionSegmentKind;
	// The node it names: its icon and value.
	public readonly node: GraphLayoutNode | null;
	public readonly count: number | null;
	// For MATCHED_WITH: the kind it was matched with (ACQUIRED when the focus sold).
	public readonly opposite: ProvenanceEventKind | null;
	// For LEFT_OUT: why.
	public readonly drop: ProvenanceDrop | null;

	public constructor(args: CaptionSegmentArgs) {
		this.kind = args.kind;
		this.node = args.node;
		this.count = args.count;
		this.opposite = args.opposite;
		this.drop = args.drop;
	}
}
