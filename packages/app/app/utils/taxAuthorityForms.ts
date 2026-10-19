import { SlovenianReportTypeId, TaxAuthorityId } from "@brrr/lib";
import type { TaxAuthorityForm } from "~/types/taxYearReports";

// Every form each tax authority makes, in the order its tabs show them.
export const TAX_AUTHORITY_FORMS: TaxAuthorityForm[] = [
	{
		authorityId: TaxAuthorityId.SLOVENIA,
		reportTypeId: SlovenianReportTypeId.KDVP,
		code: "Doh-KDVP",
		nameKey: "report_type_kdvp",
		xmlFilename: "Doh_KDVP.xml",
		csvFilename: "export-trades.csv",
		takesTaxpayer: true,
	},
	{
		authorityId: TaxAuthorityId.SLOVENIA,
		reportTypeId: SlovenianReportTypeId.DIV,
		code: "Doh-Div",
		nameKey: "report_type_div",
		xmlFilename: "Doh_Div.xml",
		csvFilename: "export-dividends.csv",
		takesTaxpayer: true,
	},
	// D-IFI's XML has no taxpayer block.
	{
		authorityId: TaxAuthorityId.SLOVENIA,
		reportTypeId: SlovenianReportTypeId.IFI,
		code: "D-IFI",
		nameKey: "report_type_ifi",
		xmlFilename: "D_Ifi.xml",
		csvFilename: "export-derivatives.csv",
		takesTaxpayer: false,
	},
];

export function taxAuthorityFormsOf(authorityId: TaxAuthorityId): TaxAuthorityForm[] {
	return TAX_AUTHORITY_FORMS.filter((form) => form.authorityId === authorityId);
}
