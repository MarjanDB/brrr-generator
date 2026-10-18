import {
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	ProvenanceNodeKind,
	type ProvenanceWalker,
	type ReportInstrument,
} from "@brrr/lib";
import { DateTime } from "luxon";
import { fieldOf } from "~/download/fields";
import { Timeline } from "~/download/timeline/Timeline";
import { TimelineArc } from "~/download/timeline/TimelineArc";
import { TimelineMark } from "~/download/timeline/TimelineMark";
import { TimelineMarkKind } from "~/download/timeline/TimelineMarkKind";

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
		return new TimelineMark({ node: draft.node, kind: draft.kind, at: draft.at, stack });
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
			new TimelineArc({
				lot: matched.node,
				from,
				to,
				quantity: Number(fieldOf(matched.node, ProvenanceField.QUANTITY)),
			}),
		];
	});
}

// The instrument's events, broker lots and corporate actions as marks on a time axis, and each
// matched lot as an arc from its buy to its sale. Reads only nodes, edges and fields.
export function buildTimeline(instrument: ReportInstrument, walker: ProvenanceWalker): Timeline {
	const marks = marksOf(draftsOf(instrument));
	return new Timeline({
		marks,
		arcs: arcsOf(instrument, marks, walker),
		first: marks[0]?.at ?? 0,
		last: marks[marks.length - 1]?.at ?? 0,
		stackDepth: Math.max(0, ...marks.map((mark) => mark.stack + 1)),
	});
}
