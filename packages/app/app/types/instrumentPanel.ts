import type {
	IdentifierChangeType,
	OptionRight,
	ProvenanceDetailKind,
	ProvenanceDrop,
	ProvenanceWarning,
	ReportInstrument,
	ReportInstrumentKind,
	ReportLeftOut,
} from "@brrr/lib";

// An option contract's terms, as the grouping recorded them.
export type PanelContract = {
	underlyingSymbol: string;
	// yyyy-MM-dd, as recorded
	expiry: string;
	strike: string;
	right: OptionRight;
	// The grouping's TICKER: the broker's own symbol for the contract.
	occSymbol: string;
};

// One row of the download panel: an instrument and what its row says about it.
export type PanelEntry = {
	instrument: ReportInstrument;
	kind: ReportInstrumentKind;
	// "" when the grouping has none
	ticker: string;
	isin: string | null;
	// Set for an option contract.
	contract: PanelContract | null;
	hasCorporateAction: boolean;
	notInReport: number;
	lineCount: number;
	warningCount: number;
};

export type PanelUnderlying = {
	symbol: string;
	contracts: PanelEntry[];
};

export type PanelSections = {
	stocks: PanelEntry[];
	underlyings: PanelUnderlying[];
	payers: PanelEntry[];
	// Every kind, in the reader's order.
	withoutLines: PanelEntry[];
};

export type WarningItem = {
	// The instrument the warning is about, which a click on it selects, and its title: its ticker,
	// or a contract's OCC symbol.
	instrument: ReportInstrument;
	title: string;
	warning: ProvenanceWarning;
};

// The report's warnings of one kind, as the list its warnings button opens groups them.
export type WarningGroup = {
	kind: ProvenanceDetailKind;
	items: WarningItem[];
};

// What the report left out for one reason, said the same way, as the list its needs-a-look button
// opens groups it. The drop says the group's sentence.
export type LeftOutGroup = {
	drop: ProvenanceDrop;
	items: ReportLeftOut[];
};

// What a corporate action chip in the instrument header says, as the action recorded it.
export type SplitChip = {
	kind: IdentifierChangeType;
	before: string | null;
	after: string | null;
	fromIsin: string | null;
	fromTicker: string | null;
};
