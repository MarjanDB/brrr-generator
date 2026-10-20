import type { TaxAuthorityId } from "@brrr/lib";

// A tax office as the site shows it: on the landing page, and on the configure step's cards with
// its id added. It carries no ids itself, so the landing page needs nothing from lib.
export type TaxOfficeDisplay = {
	// The country, as an i18n key.
	countryKey: string;
	// The office's own name, in its own language.
	name: string;
	iconUrl: string;
	// The forms it takes, as i18n keys.
	formKeys: string[];
};

// A tax office with the id the configure step picks it by.
export type TaxAuthorityCard = TaxOfficeDisplay & {
	authorityId: TaxAuthorityId;
};
