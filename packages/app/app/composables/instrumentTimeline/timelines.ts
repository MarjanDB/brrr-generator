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
	type Timeline,
	type TimelineBar,
	type TimelineMark,
	TimelineMarkKind,
	type TimelinePoint,
	TimelineWeight,
	type TimeSpan,
} from "~/types/timeline";
import { ProvenanceFields } from "~/utils/provenanceFields";

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
	const value = ProvenanceFields.of(node, field);
	if (value === null) {
		return null;
	}
	const parsed = DateTime.fromISO(value, { zone: "utc" });
	return parsed.isValid ? parsed.toMillis() : null;
}

function eventKindOf(node: ProvenanceNode): ProvenanceEventKind | null {
	const value = ProvenanceFields.of(node, ProvenanceField.EVENT_KIND);
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

// The report's lines the node became. The walk never enters a grouping: every line is made with its
// instrument's grouping, so through it every member would reach every line.
function linesReachedBy(node: ProvenanceNode, walker: ProvenanceWalker): ProvenanceNode[] {
	const lines = new Set<ProvenanceNode>();
	const pending = [node];
	const seen = new Set(pending);
	for (const current of pending) {
		for (const { to } of walker.children(current)) {
			if (to.kind === ProvenanceNodeKind.REPORT_LINE) {
				lines.add(to);
			} else if (to.kind !== ProvenanceNodeKind.GROUPING && !seen.has(to)) {
				seen.add(to);
				pending.push(to);
			}
		}
	}
	return [...lines];
}

// Whether the node became one of the report's lines.
function reachesALine(node: ProvenanceNode, walker: ProvenanceWalker): boolean {
	return linesReachedBy(node, walker).length > 0;
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
				quantity: Number(ProvenanceFields.of(matched.node, ProvenanceField.QUANTITY)),
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
		const traded = Math.abs(Number(ProvenanceFields.of(mark.node, ProvenanceField.QUANTITY)));
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
function buildTimeline(instrument: ReportInstrument, walker: ProvenanceWalker): Timeline {
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

// What a click in the graph can make the focus: what the timeline draws, every mark and every lot,
// so the timeline always shows where the focus is.
function focusableOf(timeline: Timeline): ReadonlySet<ProvenanceNode> {
	return new Set([
		...timeline.marks.map((mark) => mark.node),
		...timeline.bars.flatMap((bar) => (bar.lot === null ? [] : [bar.lot])),
	]);
}

// `lit` is the set of nodes in the chain the user picked, or null when none is picked.
function markStateOf(
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
function barStateOf(
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

// An instrument's timeline: its marks and lot bars, what can take the focus, and how each shows it.
export const Timelines = {
	build: buildTimeline,
	focusableOf,
	linesReachedBy,
	reachesALine,
	markStateOf,
	barStateOf,
};
