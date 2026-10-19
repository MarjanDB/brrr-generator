import type { TaxAuthorityId } from "@brrr/lib";
import type { GeneratedOutputs } from "~/types/generatedOutputs";

// A form a tax authority's reports step makes for each year: its tab, the files it downloads as,
// and whether its XML carries the taxpayer's details, and so asks for them first.
export type TaxAuthorityForm = {
	authorityId: TaxAuthorityId;
	reportTypeId: string;
	// The form's own name, as the authority writes it, the same in every language: its tab.
	code: string;
	// What the form covers, in the reader's language: its tab's tooltip.
	nameKey: string;
	xmlFilename: string;
	csvFilename: string;
	takesTaxpayer: boolean;
};

// A form and what it made for the year.
export type TaxYearReport = {
	form: TaxAuthorityForm;
	outputs: GeneratedOutputs;
};

// What a form's XML download asks the taxpayer for, as typed. Any of it may be left empty except
// the country, an ISO 3166-1 alpha-2 code, which decides whether the taxpayer is a resident.
export type TaxpayerDetails = {
	taxNumber: string;
	name: string;
	address: string;
	city: string;
	postNumber: string;
	postName: string;
	countryId: string;
};
