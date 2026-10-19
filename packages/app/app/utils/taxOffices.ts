import type { TaxOfficeDisplay } from "~/types/taxOffice";

// The tax offices the site makes forms for, as it shows them. Nothing here imports lib, so the
// landing page can list them without loading it; the configure step's cards add each one's id.
export const SLOVENIA_TAX_OFFICE: TaxOfficeDisplay = {
	countryKey: "country_slovenia",
	name: "Finančna uprava Republike Slovenije",
	iconUrl: "/icons/tax-authorities/edavki.svg",
	formKeys: ["report_type_kdvp", "report_type_div", "report_type_ifi"],
};

export const TAX_OFFICES: TaxOfficeDisplay[] = [SLOVENIA_TAX_OFFICE];
