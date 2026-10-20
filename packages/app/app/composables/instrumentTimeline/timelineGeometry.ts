import { DateTime } from "luxon";
import {
	type Point,
	TickGranularity,
	type TimelineBar,
	TimelineMarkKind,
	type TimelineRow,
	TimelineRowKind,
	type TimelineTick,
	TimelineWeight,
	type TimeSpan,
} from "~/types/timeline";

// The chart's y scale puts one row in each unit: bar 0 (the top one) at `bars`, the last at 1, and
// the points' row at 0, its stacks going down.
function barY(index: number, bars: number): number {
	return bars - index;
}

function pointY(stack: number): number {
	return -stack;
}

type YRange = { min: number; max: number };

// The y scale's range for that layout, with room for a bar's label above the top row, for a mark's
// size around the points, and for the tax year's label under the lowest row.
function timelineYRange(bars: number, stackDepth: number): YRange {
	return {
		min: stackDepth > 0 ? -(stackDepth - 1) - 0.9 : 0,
		max: bars > 0 ? bars + 0.7 : 0.9,
	};
}

const rowSpacing = 34;
const minRowSpacing = 12;
const roomyRows = 12;

const markSpacing = 16;
const rowGap = 4;

// How big every bar, triangle and point is, in pixels: 16, whatever its quantity or weight (the
// quantity is in the bar's label, inside it), and less only where rows are so close it must leave
// 4 px between them.
function markSize(pitch: number): number {
	return Math.min(markSpacing, pitch - rowGap);
}

// Text of the timeline's 11 px font needs a bar this thick around it.
const labelledThickness = 14;
// The text keeps this far from the inner half of each triangle.
const labelPadding = 4;

// Whether a label goes inside a bar: one thick enough for the text, long enough for it between the
// halves of the triangles at its ends. A label that doesn't fit is left out.
function labelFits(thickness: number, textWidth: number, barWidth: number): boolean {
	return (
		thickness >= labelledThickness && textWidth + 2 * (thickness / 2 + labelPadding) <= barWidth
	);
}

function otherYearsOf(bars: TimelineBar[]): TimelineBar[] {
	return bars.filter((bar) => bar.closed !== null && bar.weight === TimelineWeight.CONTEXT);
}

function stillOpenOf(bars: TimelineBar[]): TimelineBar[] {
	return bars.filter((bar) => bar.closed === null);
}

// A group of one keeps a row of its own: folding it would save nothing.
function foldedRows(kind: TimelineRowKind, group: TimelineBar[]): TimelineRow[] {
	return group.length > 1
		? [{ kind, bars: group }]
		: group.map((bar) => ({ kind: TimelineRowKind.BAR, bars: [bar] }));
}

// The timeline's rows. Folded, each lot on the form has a row of its own, then the lots closed in
// other years share one row, and what is still open another, so the height follows the form.
// Spread, every bar has a row of its own, in the order they opened.
function timelineRows(bars: TimelineBar[], spread: boolean): TimelineRow[] {
	if (spread) {
		return bars.map((bar) => ({ kind: TimelineRowKind.BAR, bars: [bar] }));
	}
	return [
		...bars
			.filter((bar) => bar.closed !== null && bar.weight === TimelineWeight.REPORTED)
			.map((bar) => ({ kind: TimelineRowKind.BAR, bars: [bar] })),
		...foldedRows(TimelineRowKind.OTHER_YEARS, otherYearsOf(bars)),
		...foldedRows(TimelineRowKind.STILL_OPEN, stillOpenOf(bars)),
	];
}

// Whether spreading the rows would show anything more.
function isFoldable(bars: TimelineBar[]): boolean {
	return otherYearsOf(bars).length > 1 || stillOpenOf(bars).length > 1;
}

// How far apart the rows are, in pixels: 34 px for up to twelve bars, which leaves room for a label
// above each; more bars share the height of twelve, down to 12 px a row.
function rowPitch(bars: number): number {
	return bars <= roomyRows ? rowSpacing : Math.max(minRowSpacing, (rowSpacing * roomyRows) / bars);
}

const day = 86_400_000;
const monthTicksFromDays = 45;
// Ticks are spaced so their labels never run into each other.
const minTickSpacing = 64;
const monthSteps = [1, 2, 3, 6, 12, 24, 60];
const daySteps = [1, 2, 7, 14];

type PaddedRange = { min: number; max: number };

// The axis range: the marks' span with room on both sides, at least two days (a single day too).
function paddedRange(first: number, last: number): PaddedRange {
	const pad = Math.max(2 * day, 0.06 * (last - first));
	return { min: first - pad, max: last + pad };
}

// The report's tax year, from its first day up to the next year's, cut to the axis; null when the
// axis doesn't reach it.
function taxYearSpan(year: number, range: PaddedRange): TimeSpan | null {
	const from = Math.max(Date.UTC(year, 0, 1), range.min);
	const to = Math.min(Date.UTC(year + 1, 0, 1), range.max);
	return from < to ? { from, to } : null;
}

function dayStep(spanDays: number): number {
	if (spanDays <= 7) {
		return 1;
	}
	return spanDays <= 14 ? 2 : 7;
}

// Every `step` months from the first month start in the range that the step divides (a quarter
// starts in January, April, July or October); a step of a year or more is ticked as years.
function monthTicks(min: number, max: number, step: number): TimelineTick[] {
	const granularity = step >= 12 ? TickGranularity.YEAR : TickGranularity.MONTH;
	let month = DateTime.fromMillis(min, { zone: "utc" }).startOf("month");
	while (month.toMillis() < min || (month.year * 12 + month.month - 1) % step !== 0) {
		month = month.plus({ months: 1 });
	}
	const ticks: TimelineTick[] = [];
	while (month.toMillis() <= max) {
		ticks.push({ at: month.toMillis(), granularity });
		month = month.plus({ months: step });
	}
	return ticks;
}

function dayTicks(min: number, max: number, step: number): TimelineTick[] {
	let current = DateTime.fromMillis(min, { zone: "utc" }).startOf("day");
	if (current.toMillis() < min) {
		current = current.plus({ days: 1 });
	}
	const ticks: TimelineTick[] = [];
	while (current.toMillis() <= max) {
		ticks.push({ at: current.toMillis(), granularity: TickGranularity.DAY });
		current = current.plus({ days: step });
	}
	return ticks;
}

// The ticks for an axis `axisWidth` pixels wide, all inside the padded range, as close as their
// labels allow: for a span of over 45 days every 1, 2, 3 or 6 months, else every 1, 2 or 5 years;
// for a shorter one every 1, 2, 7 or 14 days, never closer than the span asks for.
function timelineTicks(first: number, last: number, axisWidth: number): TimelineTick[] {
	const { min, max } = paddedRange(first, last);
	const fits = Math.max(2, Math.floor(axisWidth / minTickSpacing));
	const spanDays = (last - first) / day;
	const months = spanDays > monthTicksFromDays;
	const steps = months ? monthSteps : daySteps.filter((step) => step >= dayStep(spanDays));
	let ticks: TimelineTick[] = [];
	for (const step of steps) {
		ticks = months ? monthTicks(min, max, step) : dayTicks(min, max, step);
		if (ticks.length <= fits) {
			break;
		}
	}
	return ticks;
}

// A lot's shape on the chart: its bar, `size` tall around `y` from `x1` to `x2`, with the outer half
// of the triangle at each end, which makes it four corners, clockwise from the top left. A buy's
// triangle points up, so it sticks out at the bottom; a sale's points down and sticks out at the
// top. What is still open ends square.
function barOutline(
	x1: number,
	x2: number,
	y: number,
	size: number,
	opened: TimelineMarkKind,
	closed: TimelineMarkKind | null,
): Point[] {
	const half = size / 2;
	const top = y - half;
	const bottom = y + half;
	const openedUp = opened === TimelineMarkKind.BOUGHT;
	const topLeft = { x: openedUp ? x1 : x1 - half, y: top };
	const bottomLeft = { x: openedUp ? x1 - half : x1, y: bottom };
	if (closed === null) {
		return [topLeft, { x: x2, y: top }, { x: x2, y: bottom }, bottomLeft];
	}
	const closedUp = closed === TimelineMarkKind.BOUGHT;
	return [
		topLeft,
		{ x: closedUp ? x2 : x2 + half, y: top },
		{ x: closedUp ? x2 + half : x2, y: bottom },
		bottomLeft,
	];
}

// Where two lines cross, each given by a point and a direction.
function crossingOf(p: Point, u: Point, q: Point, v: Point): Point {
	const t = ((q.x - p.x) * v.y - (q.y - p.y) * v.x) / (u.x * v.y - u.y * v.x);
	return { x: p.x + t * u.x, y: p.y + t * u.y };
}

// A convex shape's outline pushed out by `distance` from every edge: each edge moved out along its
// normal, the corners where the moved edges meet. The shape goes clockwise on screen, where y grows
// downward; a corner repeated is taken once.
function offsetPolygon(points: Point[], distance: number): Point[] {
	const corners = points.filter((point, index) => {
		const previous = points[(index + points.length - 1) % points.length];
		return previous === undefined || previous.x !== point.x || previous.y !== point.y;
	});
	const edges = corners.map((from, index) => {
		const to = corners[(index + 1) % corners.length] ?? from;
		const direction = { x: to.x - from.x, y: to.y - from.y };
		const length = Math.hypot(direction.x, direction.y);
		return {
			start: {
				x: from.x + (distance * direction.y) / length,
				y: from.y - (distance * direction.x) / length,
			},
			direction,
		};
	});
	return edges.map((edge, index) => {
		const previous = edges[(index + edges.length - 1) % edges.length] ?? edge;
		return crossingOf(previous.start, previous.direction, edge.start, edge.direction);
	});
}

// Where the timeline's rows, marks, bars and ticks go on the chart, and how big they are.
export const TimelineGeometry = {
	barY,
	pointY,
	yRange: timelineYRange,
	markSize,
	labelFits,
	rows: timelineRows,
	isFoldable,
	rowPitch,
	paddedRange,
	taxYearSpan,
	ticks: timelineTicks,
	barOutline,
	offsetPolygon,
};
