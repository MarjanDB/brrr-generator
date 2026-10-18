import type { TaxAuthorityId } from "@brrr/lib";

// A generated report, as the configure step hands it to the download step.
export type GeneratedOutputs = {
	xml: string;
	csv: string;
	xmlFilename: string;
	csvFilename: string;
	authorityId: TaxAuthorityId;
	reportTypeId: string;
};
