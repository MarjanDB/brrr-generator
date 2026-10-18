import type { ProvenanceUnderlyingSymbol } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ReportInstrument } from "@brrr/Provenance/Models/ReportInstrument";

export type ReportUnderlyingArgs = {
	underlyingSymbol: ProvenanceUnderlyingSymbol;
	contracts: ReportInstrument[];
};

export class ReportUnderlying {
	public readonly underlyingSymbol: ProvenanceUnderlyingSymbol;
	public readonly contracts: ReportInstrument[];

	public constructor(args: ReportUnderlyingArgs) {
		this.underlyingSymbol = args.underlyingSymbol;
		this.contracts = args.contracts;
	}
}
