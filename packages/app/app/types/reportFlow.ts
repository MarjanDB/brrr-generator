// The steps of the report flow. Each is a page under /report, its path segment the step's value.
export enum ReportStep {
	UPLOAD = "upload",
	REVIEW = "review",
	CONFIGURE = "configure",
	DOWNLOAD = "download",
}

// What the flow holds so far, which decides how far it lets you go.
export type ReportProgress = {
	hasImport: boolean;
	reviewConfirmed: boolean;
	hasReport: boolean;
};

// How many times the flow started over, took an import and generated a report.
export type ReportFlowCounts = {
	starts: number;
	imports: number;
	reports: number;
};
