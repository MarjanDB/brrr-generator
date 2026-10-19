import {
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	ProvenanceNodeKind,
	type ProvenanceWalker,
	type ReportInstrument,
	type ReportMatchedLot,
} from "@brrr/lib";
import { DateTime } from "luxon";
import {
	MarkState,
	type Point,
	TickGranularity,
	type Timeline,
	type TimelineBar,
	type TimelineMark,
	TimelineMarkKind,
	type TimelinePoint,
	type TimelineTick,
	TimelineWeight,
	type TimeSpan,
} from "~/types/timeline";
import { fieldOf } from "~/utils/provenanceFields";

const eventMarkKinds: Record<ProvenanceEventKind, TimelineMarkKind> = {
	[ProvenanceEventKind.ACQUIRED]: TimelineMarkKind.BOUGHT,
	[ProvenanceEventKind.SOLD]: TimelineMarkKind.SOLD,
	[ProvenanceEventKind.DIVIDEND]: TimelineMarkKind.DIVIDEND,
	[ProvenanceEventKind.PAYMENT_IN_LIEU]: TimelineMarkKind.DIVIDEND,
	[ProvenanceEventKind.WITHHOLDING_TAX]: TimelineMarkKind.TAX,
	[ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU]: TimelineMarkKind.TAX,
};

const markKindOrder = Object.values(TimelineMarkKind);

type Draft = { node: ProvenanceNode; kind: TimelineMarkKind; at: number };

function millisOf(node: ProvenanceNode, field: ProvenanceField): number | null {
	const value = fieldOf(node, field);
	if (value === null) {
		return null;
	}
	const parsed = DateTime.fromISO(value, { zone: "utc" });
	return parsed.isValid ? parsed.toMillis() : null;
}

function eventKindOf(node: ProvenanceNode): ProvenanceEventKind | null {
	const value = fieldOf(node, ProvenanceField.EVENT_KIND);
	return Object.values(ProvenanceEventKind).find((kind) => kind === value) ?? null;
}

function draftsOf(instrument: ReportInstrument): Draft[] {
	const drafts: Draft[] = [];
	for (const { node } of instrument.events) {
		const eventKind = eventKindOf(node);
		const at = millisOf(node, ProvenanceField.DATE);
		if (eventKind !== null && at !== null) {
			drafts.push({ node, kind: eventMarkKinds[eventKind], at });
		}
	}
	for (const { node } of instrument.brokerLots) {
		const at = millisOf(node, ProvenanceField.ACQUIRED_DATE);
		if (at !== null) {
			drafts.push({ node, kind: TimelineMarkKind.BROKER_LOT, at });
		}
	}
	for (const node of instrument.corporateActions) {
		const at = millisOf(node, ProvenanceField.DATE);
		if (at !== null) {
			drafts.push({ node, kind: TimelineMarkKind.CORPORATE_ACTION, at });
		}
	}
	return drafts.sort(
		(left, right) =>
			left.at - right.at || markKindOrder.indexOf(left.kind) - markKindOrder.indexOf(right.kind),
	);
}

// Whether the node became one of the report's lines. The walk never enters a grouping: every line is
// made with its instrument's grouping, so through it every member would reach every line.
export function reachesALine(node: ProvenanceNode, walker: ProvenanceWalker): boolean {
	const pending = [node];
	const seen = new Set(pending);
	for (const current of pending) {
		for (const { to } of walker.children(current)) {
			if (to.kind === ProvenanceNodeKind.REPORT_LINE) {
				return true;
			}
			if (to.kind !== ProvenanceNodeKind.GROUPING && !seen.has(to)) {
				seen.add(to);
				pending.push(to);
			}
		}
	}
	return false;
}

// A matched lot is on the form when one of its legs became a line: it closed in the report's period.
function isReported(matched: ReportMatchedLot): boolean {
	return matched.acquired.line !== null || matched.sold.line !== null;
}

function lotEventsOf(
	matched: ReportMatchedLot,
	walker: ProvenanceWalker,
): { acquired: ProvenanceNode | undefined; sold: ProvenanceNode | undefined } {
	const parents = walker
		.parents(matched.node)
		.map((edge) => edge.from)
		.filter((node) => node.kind === ProvenanceNodeKind.EVENT);
	return {
		acquired: parents.find((node) => eventKindOf(node) === ProvenanceEventKind.ACQUIRED),
		sold: parents.find((node) => eventKindOf(node) === ProvenanceEventKind.SOLD),
	};
}

// The days each lot on the form was held, from its buy to its sale, both included.
function reportedHoldings(instrument: ReportInstrument, walker: ProvenanceWalker): TimeSpan[] {
	return instrument.matchedLots.filter(isReported).flatMap((matched) => {
		const { acquired, sold } = lotEventsOf(matched, walker);
		const from = acquired === undefined ? null : millisOf(acquired, ProvenanceField.DATE);
		const to = sold === undefined ? null : millisOf(sold, ProvenanceField.DATE);
		return from === null || to === null ? [] : [{ from, to }];
	});
}

// An event or a broker lot is on the form when it became one of its lines. So is a corporate action
// that rebuilt a trade on the form (a split scales every trade before it), and one that happened
// while a lot on the form was held (a rename only rebuilds the grouping).
function weightOf(draft: Draft, held: TimeSpan[], walker: ProvenanceWalker): TimelineWeight {
	const duringAHolding =
		draft.kind === TimelineMarkKind.CORPORATE_ACTION &&
		held.some((span) => span.from <= draft.at && draft.at <= span.to);
	return duringAHolding || reachesALine(draft.node, walker)
		? TimelineWeight.REPORTED
		: TimelineWeight.CONTEXT;
}

function marksOf(drafts: Draft[], weightOfDraft: (draft: Draft) => TimelineWeight): TimelineMark[] {
	return drafts.map((draft) => ({
		node: draft.node,
		kind: draft.kind,
		at: draft.at,
		weight: weightOfDraft(draft),
	}));
}

function isTrade(mark: TimelineMark): boolean {
	return mark.kind === TimelineMarkKind.BOUGHT || mark.kind === TimelineMarkKind.SOLD;
}

function lotBarsOf(
	instrument: ReportInstrument,
	marks: TimelineMark[],
	walker: ProvenanceWalker,
): TimelineBar[] {
	const markOf = new Map(marks.map((mark) => [mark.node, mark]));
	return instrument.matchedLots.flatMap((matched) => {
		const { acquired, sold } = lotEventsOf(matched, walker);
		const bought = acquired === undefined ? undefined : markOf.get(acquired);
		const sale = sold === undefined ? undefined : markOf.get(sold);
		if (bought === undefined || sale === undefined) {
			return [];
		}
		// A written option opens with its sale.
		const [opened, closed] = sale.at < bought.at ? [sale, bought] : [bought, sale];
		return [
			{
				lot: matched.node,
				opened,
				closed,
				quantity: Number(fieldOf(matched.node, ProvenanceField.QUANTITY)),
				weight: isReported(matched) ? TimelineWeight.REPORTED : TimelineWeight.CONTEXT,
			},
		];
	});
}

// Less than this left of a trade is rounding, not a position.
const leftover = 1e-9;

// What is left of each trade once its lots took their share: a bar that stays open. An open
// position is never on the form.
function openBarsOf(marks: TimelineMark[], lotBars: TimelineBar[]): TimelineBar[] {
	return marks.filter(isTrade).flatMap((mark) => {
		const traded = Math.abs(Number(fieldOf(mark.node, ProvenanceField.QUANTITY)));
		const inLots = lotBars
			.filter((bar) => bar.opened === mark || bar.closed === mark)
			.reduce((sum, bar) => sum + bar.quantity, 0);
		const open = traded - inLots;
		if (!Number.isFinite(open) || open <= leftover) {
			return [];
		}
		return [
			{ lot: null, opened: mark, closed: null, quantity: open, weight: TimelineWeight.CONTEXT },
		];
	});
}

// By the day each bar opened, then the day it closed; one still open comes last.
function byOpening(left: TimelineBar, right: TimelineBar): number {
	const stillOpen = Number.MAX_SAFE_INTEGER;
	return (
		left.opened.at - right.opened.at ||
		(left.closed?.at ?? stillOpen) - (right.closed?.at ?? stillOpen)
	);
}

function pointsOf(marks: TimelineMark[], bars: TimelineBar[]): TimelinePoint[] {
	const onBars = new Set(bars.flatMap((bar) => [bar.opened, bar.closed]));
	const seenOnDay = new Map<number, number>();
	return marks
		.filter((mark) => !onBars.has(mark))
		.map((mark) => {
			const stack = seenOnDay.get(mark.at) ?? 0;
			seenOnDay.set(mark.at, stack + 1);
			return { mark, stack };
		});
}

// The instrument's events, broker lots and corporate actions as marks on a time axis, each weighed
// as on the form or there for context. Each matched lot is a bar from the trade that opened it to
// the one that closed it, and what no lot closed a bar that stays open; every other mark is a point
// under the bars. Reads only nodes, edges and fields.
export function buildTimeline(instrument: ReportInstrument, walker: ProvenanceWalker): Timeline {
	const held = reportedHoldings(instrument, walker);
	const marks = marksOf(draftsOf(instrument), (draft) => weightOf(draft, held, walker));
	const lotBars = lotBarsOf(instrument, marks, walker);
	const bars = [...lotBars, ...openBarsOf(marks, lotBars)].sort(byOpening);
	const points = pointsOf(marks, bars);
	return {
		marks,
		bars,
		points,
		first: marks[0]?.at ?? 0,
		last: marks[marks.length - 1]?.at ?? 0,
		stackDepth: Math.max(0, ...points.map((point) => point.stack + 1)),
	};
}

// The chart's y scale puts one row in each unit: bar 0 (the top one) at `bars`, the last at 1, and
// the points' row at 0, its stacks going down.
export function barY(index: number, bars: number): number {
	return bars - index;
}

export function pointY(stack: number): number {
	return -stack;
}

export type YRange = { min: number; max: number };

// The y scale's range for that layout, with room for a bar's label above the top row, for a mark's
// size around the points, and for the tax year's label under the lowest row.
export function timelineYRange(bars: number, stackDepth: number): YRange {
	return {
		min: stackDepth > 0 ? -(stackDepth - 1) - 0.9 : 0,
		max: bars > 0 ? bars + 0.7 : 0.9,
	};
}

const rowSpacing = 34;
const minRowSpacing = 12;
const roomyRows = 12;

const markSpacing = 12;
const rowGap = 4;

// How big every bar, triangle and point is, in pixels: 12, whatever its quantity or weight (the
// quantity is in the bar's label), and less only where rows are so close it must leave 4 px between
// them.
export function markSize(pitch: number): number {
	return Math.min(markSpacing, pitch - rowGap);
}

// How far apart the rows are, in pixels: 34 px for up to twelve bars, which leaves room for a label
// above each; more bars share the height of twelve, down to 12 px a row.
export function rowPitch(bars: number): number {
	return bars <= roomyRows ? rowSpacing : Math.max(minRowSpacing, (rowSpacing * roomyRows) / bars);
}

const day = 86_400_000;
const monthTicksFromDays = 45;
// Ticks are spaced so their labels never run into each other.
const minTickSpacing = 64;
const monthSteps = [1, 2, 3, 6, 12, 24, 60];
const daySteps = [1, 2, 7, 14];

export type PaddedRange = { min: number; max: number };

// The axis range: the marks' span with room on both sides, at least two days (a single day too).
export function paddedRange(first: number, last: number): PaddedRange {
	const pad = Math.max(2 * day, 0.06 * (last - first));
	return { min: first - pad, max: last + pad };
}

// The report's tax year, from its first day up to the next year's, cut to the axis; null when the
// axis doesn't reach it.
export function taxYearSpan(year: number, range: PaddedRange): TimeSpan | null {
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
export function timelineTicks(first: number, last: number, axisWidth: number): TimelineTick[] {
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

// `lit` is the set of nodes in the chain the user picked, or null when none is picked.
export function markStateOf(
	node: ProvenanceNode,
	focus: ProvenanceNode | null,
	lit: ReadonlySet<ProvenanceNode> | null,
): MarkState {
	if (node === focus) {
		return MarkState.FOCUSED;
	}
	if (lit === null) {
		return MarkState.NORMAL;
	}
	return lit.has(node) ? MarkState.LIT : MarkState.DIMMED;
}

// A lot's bar is lit by its own state, and also when the focus is the trade that opened or closed
// it. What is still open has no lot, so it takes the state of the trade that opened it.
export function barStateOf(
	bar: TimelineBar,
	focus: ProvenanceNode | null,
	lit: ReadonlySet<ProvenanceNode> | null,
): MarkState {
	const own = markStateOf(bar.lot ?? bar.opened.node, focus, lit);
	if (own === MarkState.FOCUSED || own === MarkState.LIT) {
		return own;
	}
	return focus !== null && (bar.opened.node === focus || bar.closed?.node === focus)
		? MarkState.LIT
		: own;
}

// A lot's shape on the chart: its bar, `size` tall around `y` from `x1` to `x2`, with the outer half
// of the triangle at each end, which makes it four corners, clockwise from the top left. A buy's
// triangle points up, so it sticks out at the bottom; a sale's points down and sticks out at the
// top. What is still open ends square.
export function barOutline(
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
export function offsetPolygon(points: Point[], distance: number): Point[] {
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
