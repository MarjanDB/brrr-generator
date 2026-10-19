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
	type ArcGeometry,
	MarkState,
	type Point,
	TickGranularity,
	type Timeline,
	type TimelineArc,
	type TimelineMark,
	TimelineMarkKind,
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
	const seenOnDay = new Map<number, number>();
	return drafts.map((draft) => {
		const stack = seenOnDay.get(draft.at) ?? 0;
		seenOnDay.set(draft.at, stack + 1);
		return {
			node: draft.node,
			kind: draft.kind,
			at: draft.at,
			stack,
			weight: weightOfDraft(draft),
		};
	});
}

function arcsOf(
	instrument: ReportInstrument,
	marks: TimelineMark[],
	walker: ProvenanceWalker,
): TimelineArc[] {
	const markOf = new Map(marks.map((mark) => [mark.node, mark]));
	return instrument.matchedLots.flatMap((matched) => {
		const { acquired, sold } = lotEventsOf(matched, walker);
		const from = acquired === undefined ? undefined : markOf.get(acquired);
		const to = sold === undefined ? undefined : markOf.get(sold);
		if (from === undefined || to === undefined) {
			return [];
		}
		return [
			{
				lot: matched.node,
				from,
				to,
				quantity: Number(fieldOf(matched.node, ProvenanceField.QUANTITY)),
				weight: isReported(matched) ? TimelineWeight.REPORTED : TimelineWeight.CONTEXT,
			},
		];
	});
}

// The instrument's events, broker lots and corporate actions as marks on a time axis, and each
// matched lot as an arc from its buy to its sale, each weighed as on the form or there for context.
// Reads only nodes, edges and fields.
export function buildTimeline(instrument: ReportInstrument, walker: ProvenanceWalker): Timeline {
	const held = reportedHoldings(instrument, walker);
	const marks = marksOf(draftsOf(instrument), (draft) => weightOf(draft, held, walker));
	return {
		marks,
		arcs: arcsOf(instrument, marks, walker),
		first: marks[0]?.at ?? 0,
		last: marks[marks.length - 1]?.at ?? 0,
		stackDepth: Math.max(0, ...marks.map((mark) => mark.stack + 1)),
	};
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

const samples = 24;

// An arc from one point of the axis to another, rising `rise` above its middle. A quadratic curve
// reaches half way to its control point, so the control sits twice as high.
export function arcGeometry(x1: number, x2: number, axisY: number, rise: number): ArcGeometry {
	return {
		start: { x: x1, y: axisY },
		end: { x: x2, y: axisY },
		control: { x: (x1 + x2) / 2, y: axisY - 2 * rise },
	};
}

function pointAt(arc: ArcGeometry, t: number): Point {
	const mirror = 1 - t;
	return {
		x: mirror * mirror * arc.start.x + 2 * mirror * t * arc.control.x + t * t * arc.end.x,
		y: mirror * mirror * arc.start.y + 2 * mirror * t * arc.control.y + t * t * arc.end.y,
	};
}

// Whether the point is within `tolerance` of the curve, measured to 24 points along it.
export function arcHit(arc: ArcGeometry, point: Point, tolerance: number): boolean {
	for (let index = 0; index <= samples; index++) {
		const onCurve = pointAt(arc, index / samples);
		if (Math.hypot(onCurve.x - point.x, onCurve.y - point.y) <= tolerance) {
			return true;
		}
	}
	return false;
}
