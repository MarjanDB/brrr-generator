import type { ReportInstrument } from "@brrr/Provenance/Models/ReportInstrument";

export type ReportUnderlyingArgs = {
	underlyingSymbol: string;
	contracts: ReportInstrument[];
};

export class ReportUnderlying {
	public readonly underlyingSymbol: string;
	public readonly contracts: ReportInstrument[];

	public constructor(args: ReportUnderlyingArgs) {
		this.underlyingSymbol = args.underlyingSymbol;
		this.contracts = args.contracts;
	}
}
