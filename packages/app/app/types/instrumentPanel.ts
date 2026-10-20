import type {
	IdentifierChangeType,
	OptionRight,
	ProvenanceDrop,
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

// What the report left out for one reason, said the same way, as the problems view groups it. The
// drop says the group's sentence.
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
