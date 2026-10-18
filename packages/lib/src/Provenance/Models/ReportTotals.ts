export type ReportTotalsArgs = {
	lines: number;
	notInReport: number;
	needsALook: number;
	warnings: number;
};

export class ReportTotals {
	public readonly lines: number;
	public readonly notInReport: number;
	public readonly needsALook: number;
	public readonly warnings: number;

	public constructor(args: ReportTotalsArgs) {
		this.lines = args.lines;
		this.notInReport = args.notInReport;
		this.needsALook = args.needsALook;
		this.warnings = args.warnings;
	}
}
