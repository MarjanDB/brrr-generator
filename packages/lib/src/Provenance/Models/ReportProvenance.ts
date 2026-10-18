import type { ReportInstrument } from "@brrr/Provenance/Models/ReportInstrument";
import type { ReportLeftOut } from "@brrr/Provenance/Models/ReportLeftOut";
import type { ReportTotals } from "@brrr/Provenance/Models/ReportTotals";
import type { ReportUnderlying } from "@brrr/Provenance/Models/ReportUnderlying";

export type ReportProvenanceArgs = {
	shares: ReportInstrument[];
	optionUnderlyings: ReportUnderlying[];
	dividendPayers: ReportInstrument[];
	withoutLines: ReportInstrument[];
	needsALook: ReportLeftOut[];
	totals: ReportTotals;
};

export class ReportProvenance {
	public readonly shares: ReportInstrument[];
	public readonly optionUnderlyings: ReportUnderlying[];
	public readonly dividendPayers: ReportInstrument[];
	public readonly withoutLines: ReportInstrument[];
	public readonly needsALook: ReportLeftOut[];
	public readonly totals: ReportTotals;

	public constructor(args: ReportProvenanceArgs) {
		this.shares = args.shares;
		this.optionUnderlyings = args.optionUnderlyings;
		this.dividendPayers = args.dividendPayers;
		this.withoutLines = args.withoutLines;
		this.needsALook = args.needsALook;
		this.totals = args.totals;
	}
}
