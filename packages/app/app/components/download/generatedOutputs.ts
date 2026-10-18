import type { ImportResult, ProvenanceGraph, TaxAuthorityId } from "@brrr/lib";

// A generated report, as the configure step hands it to the download step. It also carries the
// report's provenance graph (which includes the import's) and the import, for the download step's
// provenance view.
export type GeneratedOutputs = {
	xml: string;
	csv: string;
	xmlFilename: string;
	csvFilename: string;
	authorityId: TaxAuthorityId;
	reportTypeId: string;
	provenance: ProvenanceGraph;
	imported: ImportResult;
};
