import type {
	IdentifierChangeType,
	OptionRight,
	ProvenanceWarning,
	ReportInstrument,
	ReportInstrumentKind,
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
	// The instrument the warning is about: its ticker, or a contract's OCC symbol.
	title: string;
	warning: ProvenanceWarning;
};

// What a corporate action chip in the instrument header says, as the action recorded it.
export type SplitChip = {
	kind: IdentifierChangeType;
	before: string | null;
	after: string | null;
	fromIsin: string | null;
	fromTicker: string | null;
};
