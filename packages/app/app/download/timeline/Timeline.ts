import type { TimelineArc } from "~/download/timeline/TimelineArc";
import type { TimelineMark } from "~/download/timeline/TimelineMark";

export type TimelineArgs = {
	marks: TimelineMark[];
	arcs: TimelineArc[];
	first: number;
	last: number;
	stackDepth: number;
};

export class Timeline {
	public readonly marks: TimelineMark[];
	public readonly arcs: TimelineArc[];
	// Epoch milliseconds of the earliest and the latest mark; 0 and 0 with no marks
	public readonly first: number;
	public readonly last: number;
	public readonly stackDepth: number;

	public constructor(args: TimelineArgs) {
		this.marks = args.marks;
		this.arcs = args.arcs;
		this.first = args.first;
		this.last = args.last;
		this.stackDepth = args.stackDepth;
	}
}
