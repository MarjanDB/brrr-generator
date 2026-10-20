import {
	IdentifierChangeType,
	type ProvenanceDrop,
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	type ProvenanceWalker,
	type ProvenanceWarning,
	type ReportInstrument,
	type ReportLeftOut,
	type ReportMatchedLot,
} from "@brrr/lib";
import { Timelines } from "~/composables/instrumentTimeline/timelines";
import { GraphModels } from "~/composables/provenanceGraph/graphModels";
import type { LeftOutGroup, SplitChip } from "~/types/instrumentPanel";
import { SplitFactorKind } from "~/types/provenanceGraph";
import { ProvenanceFields } from "~/utils/provenanceFields";

// The item an instrument opens on: its first sale on the form (the sketch opens on a sale, which has
// the richest graph), else its first dividend on the form; for an instrument with nothing on the
// form, its first sale, dividend, event, broker lot or corporate action.
function defaultFocus(instrument: ReportInstrument, walker: ProvenanceWalker): ProvenanceNode {
	const events = instrument.events.map((item) => item.node);
	const reported = events.filter((event) => Timelines.reachesALine(event, walker));
	const firstOf = (
		candidates: ProvenanceNode[],
		kind: ProvenanceEventKind,
	): ProvenanceNode | undefined =>
		candidates.find((event) => ProvenanceFields.of(event, ProvenanceField.EVENT_KIND) === kind);
	const focus =
		firstOf(reported, ProvenanceEventKind.SOLD) ??
		firstOf(reported, ProvenanceEventKind.DIVIDEND) ??
		firstOf(events, ProvenanceEventKind.SOLD) ??
		firstOf(events, ProvenanceEventKind.DIVIDEND) ??
		events[0] ??
		instrument.brokerLots[0]?.node ??
		instrument.corporateActions[0];
	if (focus === undefined) {
		throw new Error("An instrument in the report has no item to focus on");
	}
	return focus;
}

// Items in groups by a key, the groups in the order their keys first come.
function groupsBy<Item>(items: Item[], keyOf: (item: Item) => string): Item[][] {
	const groups = new Map<string, Item[]>();
	for (const item of items) {
		const key = keyOf(item);
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}
	return [...groups.values()];
}

// What was left out, grouped by its reason and how it was said, as the review step groups the
// import's: rows of an asset class we don't support are one group, another asset class another.
function leftOutGroupsOf(leftOut: ReportLeftOut[]): LeftOutGroup[] {
	return groupsBy(leftOut, (item) => dropKey(item.drop)).flatMap((group) => {
		const [first] = group;
		return first === undefined ? [] : [{ drop: first.drop, items: group }];
	});
}

function matchedLotOf(instrument: ReportInstrument, node: ProvenanceNode): ReportMatchedLot | null {
	return instrument.matchedLots.find((matched) => matched.node === node) ?? null;
}

// A drop's reason and detail, not where it sits: two legs dropped the same way are one.
function dropKey(drop: ProvenanceDrop): string {
	const values = Object.entries(drop.detail?.values ?? {})
		.map(([name, value]) => `${name}=${value}`)
		.sort();
	return `${drop.reason}:${drop.detail?.kind ?? "-"}:${values.join(",")}`;
}

// What the report left out about one item of the instrument: an event, a broker lot, or a matched
// lot (both of its legs, said once when they were left out the same way).
function leftOutOf(instrument: ReportInstrument, node: ProvenanceNode): ReportLeftOut[] {
	const own = [...instrument.events, ...instrument.brokerLots]
		.filter((item) => item.node === node)
		.flatMap((item) => item.leftOut);
	const matched = matchedLotOf(instrument, node);
	const all =
		matched === null ? own : [...own, ...matched.acquired.leftOut, ...matched.sold.leftOut];
	const byKey = new Map<string, ReportLeftOut>();
	for (const item of all) {
		const key = dropKey(item.drop);
		if (!byKey.has(key)) {
			byKey.set(key, item);
		}
	}
	return [...byKey.values()];
}

// The warnings about one item: on the node itself, or for a matched lot on its legs and lines.
function warningsOf(instrument: ReportInstrument, node: ProvenanceNode): ProvenanceWarning[] {
	const matched = matchedLotOf(instrument, node);
	const nodes = new Set<ProvenanceNode>([node]);
	if (matched !== null) {
		for (const side of [matched.acquired, matched.sold]) {
			nodes.add(side.leg);
			if (side.line !== null) {
				nodes.add(side.line);
			}
		}
	}
	return instrument.warnings.filter((warning) => nodes.has(warning.node));
}

// A split's ratio in the usual form: 4 shares becoming 40 is 10 : 1, 10 becoming 1 is 1 : 10.
function splitRatioOf(chip: SplitChip, locale: string): { before: string; after: string } | null {
	if (chip.before === null || chip.after === null) {
		return null;
	}
	const factor = GraphModels.splitFactorOf(chip.before, chip.after);
	if (factor === null) {
		return null;
	}
	const amount = ProvenanceFields.formatNumber(String(factor.amount), locale);
	return factor.kind === SplitFactorKind.MULTIPLY
		? { before: amount, after: "1" }
		: { before: "1", after: amount };
}

function chipKindOf(value: string | null): IdentifierChangeType | null {
	return Object.values(IdentifierChangeType).find((kind) => kind === value) ?? null;
}

// A corporate action's chip, from the facts it recorded; null for a kind it has no chip for.
function chipOf(action: ProvenanceNode): SplitChip | null {
	const kind = chipKindOf(ProvenanceFields.of(action, ProvenanceField.CORPORATE_ACTION_KIND));
	if (kind === null) {
		return null;
	}
	return {
		kind,
		before: ProvenanceFields.of(action, ProvenanceField.SPLIT_BEFORE),
		after: ProvenanceFields.of(action, ProvenanceField.SPLIT_AFTER),
		fromIsin: ProvenanceFields.of(action, ProvenanceField.FROM_ISIN),
		fromTicker: ProvenanceFields.of(action, ProvenanceField.FROM_TICKER),
	};
}

// One chip per corporate action behind the instrument.
function chipsOf(instrument: ReportInstrument): SplitChip[] {
	return instrument.corporateActions.flatMap((action) => {
		const chip = chipOf(action);
		return chip === null ? [] : [chip];
	});
}

// What the report says about an instrument and its items: where it opens, what was left out or warned about, and its corporate actions.
export const ReportInstruments = {
	defaultFocus,
	leftOutOf,
	warningsOf,
	leftOutGroupsOf,
	chipOf,
	chipsOf,
	splitRatioOf,
};
