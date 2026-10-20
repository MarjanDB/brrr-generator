import type { CompanyDefinition, ProvenanceDetailKind } from "@brrr/lib";

// The steps of the report flow. Each is a page under /report, its path segment the step's value.
export enum ReportStep {
	UPLOAD = "upload",
	REVIEW = "review",
	CONFIGURE = "configure",
	DOWNLOAD = "download",
}

// A dividend payer defined by hand for the session, where the company lookup found none, with the
// kind of problem it resolved, so the problems view keeps it in that problem's group.
export type DefinedPayer = {
	definition: CompanyDefinition;
	resolves: ProvenanceDetailKind;
};
