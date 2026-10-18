import {
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	ProvenanceNodeKind,
	type ProvenanceWalker,
	type ReportInstrument,
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

function marksOf(drafts: Draft[]): TimelineMark[] {
	const seenOnDay = new Map<number, number>();
	return drafts.map((draft) => {
		const stack = seenOnDay.get(draft.at) ?? 0;
		seenOnDay.set(draft.at, stack + 1);
		return { node: draft.node, kind: draft.kind, at: draft.at, stack };
	});
}

function arcsOf(
	instrument: ReportInstrument,
	marks: TimelineMark[],
	walker: ProvenanceWalker,
): TimelineArc[] {
	const markOf = new Map(marks.map((mark) => [mark.node, mark]));
	return instrument.matchedLots.flatMap((matched) => {
		const parents = walker
			.parents(matched.node)
			.map((edge) => edge.from)
			.filter((node) => node.kind === ProvenanceNodeKind.EVENT);
		const acquired = parents.find((node) => eventKindOf(node) === ProvenanceEventKind.ACQUIRED);
		const sold = parents.find((node) => eventKindOf(node) === ProvenanceEventKind.SOLD);
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
			},
		];
	});
}

// The instrument's events, broker lots and corporate actions as marks on a time axis, and each
// matched lot as an arc from its buy to its sale. Reads only nodes, edges and fields.
export function buildTimeline(instrument: ReportInstrument, walker: ProvenanceWalker): Timeline {
	const marks = marksOf(draftsOf(instrument));
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
			ticks.push({ at: month.toMillis(), granularity: TickGranularity.MONTH });
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
		ticks.push({ at: current.toMillis(), granularity: TickGranularity.DAY });
		current = current.plus({ days: step });
	}
	return ticks;
}

// `lit` is the set of nodes in the chain the user picked, or null when none is picked.
export function markStateOf(
	node: ProvenanceNode,
	focus: ProvenanceNode,
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
