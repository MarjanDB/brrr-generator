import type {
	ImportResult,
	ProvenanceGraph,
	TaxAuthorityId,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";

// A form generated for a year, as the download step shows it: its CSV and the names its files
// download as, and the report's provenance graph (which includes the import's) and the import, for
// the provenance view. Its XML is written on download, with the taxpayer's details.
export type GeneratedOutputs = {
	csv: string;
	xmlFilename: string;
	csvFilename: string;
	authorityId: TaxAuthorityId;
	reportTypeId: string;
	year: number;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
	provenance: ProvenanceGraph;
	imported: ImportResult;
};
