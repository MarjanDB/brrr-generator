import {
	IdentifierChangeType,
	OptionRight,
	type ProvenanceDrop,
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	type ProvenanceWalker,
	type ProvenanceWarning,
	type ReportInstrument,
	ReportInstrumentKind,
	type ReportLeftOut,
	type ReportMatchedLot,
	type ReportProvenance,
} from "@brrr/lib";
import type {
	LeftOutGroup,
	PanelContract,
	PanelEntry,
	PanelSections,
	SplitChip,
} from "~/types/instrumentPanel";
import { SplitFactorKind } from "~/types/provenanceGraph";
import { splitFactorOf } from "~/utils/graphModel";
import { reachesALine } from "~/utils/instrumentTimeline";
import { fieldOf, formatNumber } from "~/utils/provenanceFields";

function optionRightOf(value: string | null): OptionRight {
	const right = Object.values(OptionRight).find((candidate) => candidate === value);
	if (right === undefined) {
		throw new Error(`Option contract without a put or call: ${value}`);
	}
	return right;
}

function contractOf(instrument: ReportInstrument): PanelContract | null {
	if (instrument.kind !== ReportInstrumentKind.OPTION_CONTRACT) {
		return null;
	}
	const node = instrument.node;
	return {
		underlyingSymbol: fieldOf(node, ProvenanceField.UNDERLYING_SYMBOL) ?? "",
		expiry: fieldOf(node, ProvenanceField.EXPIRY) ?? "",
		strike: fieldOf(node, ProvenanceField.STRIKE) ?? "",
		right: optionRightOf(fieldOf(node, ProvenanceField.OPTION_RIGHT)),
		occSymbol: fieldOf(node, ProvenanceField.TICKER) ?? "",
	};
}

function entryOf(instrument: ReportInstrument): PanelEntry {
	return {
		instrument,
		kind: instrument.kind,
		ticker: fieldOf(instrument.node, ProvenanceField.TICKER) ?? "",
		isin: fieldOf(instrument.node, ProvenanceField.ISIN),
		contract: contractOf(instrument),
		hasCorporateAction: instrument.corporateActions.length > 0,
		notInReport: instrument.notInReport,
		lineCount: instrument.lines.length,
		warningCount: instrument.warnings.length,
	};
}

// Arranges the reader's instruments into the panel's sections. It adds none and drops none.
export function buildPanel(reading: ReportProvenance): PanelSections {
	return {
		stocks: reading.stocks.map(entryOf),
		underlyings: reading.optionUnderlyings.map((underlying) => ({
			symbol: underlying.underlyingSymbol,
			contracts: underlying.contracts.map(entryOf),
		})),
		payers: reading.dividendPayers.map(entryOf),
		withoutLines: reading.withoutLines.map(entryOf),
	};
}

function matches(entry: PanelEntry, query: string): boolean {
	return [
		entry.ticker,
		entry.isin ?? "",
		entry.contract?.underlyingSymbol ?? "",
		entry.contract?.occSymbol ?? "",
	].some((text) => text.toLowerCase().includes(query));
}

// Keeps the entries that match the query in their ticker, ISIN, underlying symbol or contract
// symbol, in the same sections and order. An underlying that matches keeps all its contracts, and
// one with no contract left goes.
export function filterPanel(sections: PanelSections, rawQuery: string): PanelSections {
	const query = rawQuery.trim().toLowerCase();
	if (query === "") {
		return sections;
	}
	return {
		stocks: sections.stocks.filter((entry) => matches(entry, query)),
		underlyings: sections.underlyings
			.map((underlying) =>
				underlying.symbol.toLowerCase().includes(query)
					? underlying
					: {
							symbol: underlying.symbol,
							contracts: underlying.contracts.filter((entry) => matches(entry, query)),
						},
			)
			.filter((underlying) => underlying.contracts.length > 0),
		payers: sections.payers.filter((entry) => matches(entry, query)),
		withoutLines: sections.withoutLines.filter((entry) => matches(entry, query)),
	};
}

// Every entry of the panel, in its sections' order.
export function entriesOf(sections: PanelSections): PanelEntry[] {
	return [
		...sections.stocks,
		...sections.underlyings.flatMap((underlying) => underlying.contracts),
		...sections.payers,
		...sections.withoutLines,
	];
}

// The panel's entry for an instrument, wherever it sits in the sections.
export function findEntry(
	sections: PanelSections,
	instrument: ReportInstrument,
): PanelEntry | null {
	return entriesOf(sections).find((entry) => entry.instrument === instrument) ?? null;
}

// The same instrument's entry in a report made again, whose nodes are new: the one of its kind with
// its ticker, ISIN and contract.
export function sameEntryIn(sections: PanelSections, entry: PanelEntry): PanelEntry | null {
	return (
		entriesOf(sections).find(
			(candidate) =>
				candidate.kind === entry.kind &&
				candidate.ticker === entry.ticker &&
				candidate.isin === entry.isin &&
				candidate.contract?.occSymbol === entry.contract?.occSymbol,
		) ?? null
	);
}

// The entry the step opens on: stocks, then contracts, then payers, then instruments without lines.
export function firstEntry(sections: PanelSections): PanelEntry | null {
	return (
		sections.stocks[0] ??
		sections.underlyings[0]?.contracts[0] ??
		sections.payers[0] ??
		sections.withoutLines[0] ??
		null
	);
}

// The item an instrument opens on: its first sale on the form (the sketch opens on a sale, which has
// the richest graph), else its first dividend on the form; for an instrument with nothing on the
// form, its first sale, dividend, event, broker lot or corporate action.
export function defaultFocus(
	instrument: ReportInstrument,
	walker: ProvenanceWalker,
): ProvenanceNode {
	const events = instrument.events.map((item) => item.node);
	const reported = events.filter((event) => reachesALine(event, walker));
	const firstOf = (
		candidates: ProvenanceNode[],
		kind: ProvenanceEventKind,
	): ProvenanceNode | undefined =>
		candidates.find((event) => fieldOf(event, ProvenanceField.EVENT_KIND) === kind);
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
export function leftOutGroupsOf(leftOut: ReportLeftOut[]): LeftOutGroup[] {
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
export function leftOutOf(instrument: ReportInstrument, node: ProvenanceNode): ReportLeftOut[] {
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
export function warningsOf(
	instrument: ReportInstrument,
	node: ProvenanceNode,
): ProvenanceWarning[] {
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
export function splitRatioOf(
	chip: SplitChip,
	locale: string,
): { before: string; after: string } | null {
	if (chip.before === null || chip.after === null) {
		return null;
	}
	const factor = splitFactorOf(chip.before, chip.after);
	if (factor === null) {
		return null;
	}
	const amount = formatNumber(String(factor.amount), locale);
	return factor.kind === SplitFactorKind.MULTIPLY
		? { before: amount, after: "1" }
		: { before: "1", after: amount };
}

function chipKindOf(value: string | null): IdentifierChangeType | null {
	return Object.values(IdentifierChangeType).find((kind) => kind === value) ?? null;
}

// A corporate action's chip, from the facts it recorded; null for a kind it has no chip for.
export function chipOf(action: ProvenanceNode): SplitChip | null {
	const kind = chipKindOf(fieldOf(action, ProvenanceField.CORPORATE_ACTION_KIND));
	if (kind === null) {
		return null;
	}
	return {
		kind,
		before: fieldOf(action, ProvenanceField.SPLIT_BEFORE),
		after: fieldOf(action, ProvenanceField.SPLIT_AFTER),
		fromIsin: fieldOf(action, ProvenanceField.FROM_ISIN),
		fromTicker: fieldOf(action, ProvenanceField.FROM_TICKER),
	};
}

// One chip per corporate action behind the instrument.
export function chipsOf(instrument: ReportInstrument): SplitChip[] {
	return instrument.corporateActions.flatMap((action) => {
		const chip = chipOf(action);
		return chip === null ? [] : [chip];
	});
}
