import type { ProvenanceWarning } from "@brrr/Provenance/Models/ProvenanceWarning";
import type { ReportInstrument } from "@brrr/Provenance/Models/ReportInstrument";
import type { ReportLeftOut } from "@brrr/Provenance/Models/ReportLeftOut";
import type { ReportTotals } from "@brrr/Provenance/Models/ReportTotals";
import type { ReportUnderlying } from "@brrr/Provenance/Models/ReportUnderlying";

export type ReportProvenanceArgs = {
	stocks: ReportInstrument[];
	optionUnderlyings: ReportUnderlying[];
	dividendPayers: ReportInstrument[];
	withoutLines: ReportInstrument[];
	// What the report step itself dropped and warned about, apart from its import's.
	needsALook: ReportLeftOut[];
	warnings: ProvenanceWarning[];
	totals: ReportTotals;
};

export class ReportProvenance {
	public readonly stocks: ReportInstrument[];
	public readonly optionUnderlyings: ReportUnderlying[];
	public readonly dividendPayers: ReportInstrument[];
	public readonly withoutLines: ReportInstrument[];
	public readonly needsALook: ReportLeftOut[];
	public readonly warnings: ProvenanceWarning[];
	public readonly totals: ReportTotals;

	public constructor(args: ReportProvenanceArgs) {
		this.stocks = args.stocks;
		this.optionUnderlyings = args.optionUnderlyings;
		this.dividendPayers = args.dividendPayers;
		this.withoutLines = args.withoutLines;
		this.needsALook = args.needsALook;
		this.warnings = args.warnings;
		this.totals = args.totals;
	}
}
