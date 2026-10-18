import type { ReportInstrument, ReportInstrumentKind } from "@brrr/lib";
import type { PanelContract } from "~/download/panel/PanelContract";

export type PanelEntryArgs = {
	instrument: ReportInstrument;
	kind: ReportInstrumentKind;
	ticker: string;
	isin: string | null;
	contract: PanelContract | null;
	hasCorporateAction: boolean;
	notInReport: number;
	lineCount: number;
	warningCount: number;
};

// One row of the download panel: an instrument and what its row says about it.
export class PanelEntry {
	public readonly instrument: ReportInstrument;
	public readonly kind: ReportInstrumentKind;
	// "" when the grouping has none
	public readonly ticker: string;
	public readonly isin: string | null;
	// Set for an option contract.
	public readonly contract: PanelContract | null;
	public readonly hasCorporateAction: boolean;
	public readonly notInReport: number;
	public readonly lineCount: number;
	public readonly warningCount: number;

	public constructor(args: PanelEntryArgs) {
		this.instrument = args.instrument;
		this.kind = args.kind;
		this.ticker = args.ticker;
		this.isin = args.isin;
		this.contract = args.contract;
		this.hasCorporateAction = args.hasCorporateAction;
		this.notInReport = args.notInReport;
		this.lineCount = args.lineCount;
		this.warningCount = args.warningCount;
	}
}
