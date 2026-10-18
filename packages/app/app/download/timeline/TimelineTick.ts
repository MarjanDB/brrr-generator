import type { TickGranularity } from "~/download/timeline/TickGranularity";

export type TimelineTickArgs = {
	at: number;
	granularity: TickGranularity;
};

export class TimelineTick {
	// Epoch milliseconds, UTC midnight
	public readonly at: number;
	public readonly granularity: TickGranularity;

	public constructor(args: TimelineTickArgs) {
		this.at = args.at;
		this.granularity = args.granularity;
	}
}
