import {
	OptionRight,
	ProvenanceField,
	type ReportInstrument,
	ReportInstrumentKind,
	type ReportProvenance,
} from "@brrr/lib";
import type { PanelContract, PanelEntry, PanelSections } from "~/types/instrumentPanel";
import { ProvenanceFields } from "~/utils/provenanceFields";

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
		underlyingSymbol: ProvenanceFields.of(node, ProvenanceField.UNDERLYING_SYMBOL) ?? "",
		expiry: ProvenanceFields.of(node, ProvenanceField.EXPIRY) ?? "",
		strike: ProvenanceFields.of(node, ProvenanceField.STRIKE) ?? "",
		right: optionRightOf(ProvenanceFields.of(node, ProvenanceField.OPTION_RIGHT)),
		occSymbol: ProvenanceFields.of(node, ProvenanceField.TICKER) ?? "",
	};
}

function entryOf(instrument: ReportInstrument): PanelEntry {
	return {
		instrument,
		kind: instrument.kind,
		ticker: ProvenanceFields.of(instrument.node, ProvenanceField.TICKER) ?? "",
		isin: ProvenanceFields.of(instrument.node, ProvenanceField.ISIN),
		contract: contractOf(instrument),
		hasCorporateAction: instrument.corporateActions.length > 0,
		lineCount: instrument.lines.length,
		warningCount: instrument.warnings.length,
	};
}

// Arranges the reader's instruments into the panel's sections. It adds none and drops none.
function buildPanel(reading: ReportProvenance): PanelSections {
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
function filterPanel(sections: PanelSections, rawQuery: string): PanelSections {
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
function entriesOf(sections: PanelSections): PanelEntry[] {
	return [
		...sections.stocks,
		...sections.underlyings.flatMap((underlying) => underlying.contracts),
		...sections.payers,
		...sections.withoutLines,
	];
}

// The panel's entry for an instrument, wherever it sits in the sections.
function findEntry(sections: PanelSections, instrument: ReportInstrument): PanelEntry | null {
	return entriesOf(sections).find((entry) => entry.instrument === instrument) ?? null;
}

// The same instrument's entry in a report made again, whose nodes are new: the one of its kind with
// its ticker, ISIN and contract.
function sameEntryIn(sections: PanelSections, entry: PanelEntry): PanelEntry | null {
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
function firstEntry(sections: PanelSections): PanelEntry | null {
	return (
		sections.stocks[0] ??
		sections.underlyings[0]?.contracts[0] ??
		sections.payers[0] ??
		sections.withoutLines[0] ??
		null
	);
}

// The report's instruments as the panel lists them: in sections, searched, and found again.
export const InstrumentPanels = {
	build: buildPanel,
	filter: filterPanel,
	entriesOf,
	find: findEntry,
	sameEntryIn,
	first: firstEntry,
};
