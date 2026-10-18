import { DateTime } from "luxon";
import { TickGranularity } from "~/download/timeline/TickGranularity";
import { TimelineTick } from "~/download/timeline/TimelineTick";

const day = 86_400_000;
const monthTicksFromDays = 45;

export type PaddedRange = { min: number; max: number };

// The axis range: the marks' span with room on both sides, at least two days (a single day too).
export function paddedRange(first: number, last: number): PaddedRange {
	const pad = Math.max(2 * day, 0.06 * (last - first));
	return { min: first - pad, max: last + pad };
}

function dayStep(spanDays: number): number {
	if (spanDays <= 7) {
		return 1;
	}
	return spanDays <= 14 ? 2 : 7;
}

// Month starts for a span of over 45 days, else every 1, 2 or 7 days; all inside the padded range.
export function timelineTicks(first: number, last: number): TimelineTick[] {
	const { min, max } = paddedRange(first, last);
	const spanDays = (last - first) / day;
	const ticks: TimelineTick[] = [];
	if (spanDays > monthTicksFromDays) {
		let month = DateTime.fromMillis(min, { zone: "utc" }).startOf("month");
		if (month.toMillis() < min) {
			month = month.plus({ months: 1 });
		}
		while (month.toMillis() <= max) {
			ticks.push(new TimelineTick({ at: month.toMillis(), granularity: TickGranularity.MONTH }));
			month = month.plus({ months: 1 });
		}
		return ticks;
	}
	const step = dayStep(spanDays);
	let current = DateTime.fromMillis(min, { zone: "utc" }).startOf("day");
	if (current.toMillis() < min) {
		current = current.plus({ days: 1 });
	}
	while (current.toMillis() <= max) {
		ticks.push(new TimelineTick({ at: current.toMillis(), granularity: TickGranularity.DAY }));
		current = current.plus({ days: step });
	}
	return ticks;
}
