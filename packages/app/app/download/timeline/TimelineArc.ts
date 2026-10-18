import type { ProvenanceNode } from "@brrr/lib";
import type { TimelineMark } from "~/download/timeline/TimelineMark";

export type TimelineArcArgs = {
	lot: ProvenanceNode;
	from: TimelineMark;
	to: TimelineMark;
	quantity: number;
};

// A matched lot, drawn from the buy it took to the sale it filled.
export class TimelineArc {
	public readonly lot: ProvenanceNode;
	public readonly from: TimelineMark;
	public readonly to: TimelineMark;
	public readonly quantity: number;

	public constructor(args: TimelineArcArgs) {
		this.lot = args.lot;
		this.from = args.from;
		this.to = args.to;
		this.quantity = args.quantity;
	}
}
