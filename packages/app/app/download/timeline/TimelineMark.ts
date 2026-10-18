import type { ProvenanceNode } from "@brrr/lib";
import type { TimelineMarkKind } from "~/download/timeline/TimelineMarkKind";

export type TimelineMarkArgs = {
	node: ProvenanceNode;
	kind: TimelineMarkKind;
	at: number;
	stack: number;
};

export class TimelineMark {
	public readonly node: ProvenanceNode;
	public readonly kind: TimelineMarkKind;
	// Epoch milliseconds, UTC midnight
	public readonly at: number;
	// 0 is on the axis; marks of the same day stack downward
	public readonly stack: number;

	public constructor(args: TimelineMarkArgs) {
		this.node = args.node;
		this.kind = args.kind;
		this.at = args.at;
		this.stack = args.stack;
	}
}
