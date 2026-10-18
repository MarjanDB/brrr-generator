import {
	OptionRight,
	ProvenanceField,
	type ReportInstrument,
	ReportInstrumentKind,
	type ReportProvenance,
} from "@brrr/lib";
import { fieldOf } from "~/download/fields";
import { PanelContract } from "~/download/panel/PanelContract";
import { PanelEntry } from "~/download/panel/PanelEntry";
import { PanelSections } from "~/download/panel/PanelSections";
import { PanelUnderlying } from "~/download/panel/PanelUnderlying";

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
	return new PanelContract({
		underlyingSymbol: fieldOf(node, ProvenanceField.UNDERLYING_SYMBOL) ?? "",
		expiry: fieldOf(node, ProvenanceField.EXPIRY) ?? "",
		strike: fieldOf(node, ProvenanceField.STRIKE) ?? "",
		right: optionRightOf(fieldOf(node, ProvenanceField.OPTION_RIGHT)),
		occSymbol: fieldOf(node, ProvenanceField.TICKER) ?? "",
	});
}

function entryOf(instrument: ReportInstrument): PanelEntry {
	return new PanelEntry({
		instrument,
		kind: instrument.kind,
		ticker: fieldOf(instrument.node, ProvenanceField.TICKER) ?? "",
		isin: fieldOf(instrument.node, ProvenanceField.ISIN),
		contract: contractOf(instrument),
		hasCorporateAction: instrument.corporateActions.length > 0,
		notInReport: instrument.notInReport,
		lineCount: instrument.lines.length,
		warningCount: instrument.warnings.length,
	});
}

// Arranges the reader's instruments into the panel's sections. It adds none and drops none.
export function buildPanel(reading: ReportProvenance): PanelSections {
	return new PanelSections({
		stocks: reading.stocks.map(entryOf),
		underlyings: reading.optionUnderlyings.map(
			(underlying) =>
				new PanelUnderlying({
					symbol: underlying.underlyingSymbol,
					contracts: underlying.contracts.map(entryOf),
				}),
		),
		payers: reading.dividendPayers.map(entryOf),
		withoutLines: reading.withoutLines.map(entryOf),
	});
}
