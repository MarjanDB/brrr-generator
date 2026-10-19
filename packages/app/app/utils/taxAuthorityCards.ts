import { TaxAuthorityId } from "@brrr/lib";
import type { TaxOfficeDisplay } from "~/types/taxOffice";
import { SLOVENIA_TAX_OFFICE } from "~/utils/taxOffices";

// A tax office with the id the configure step picks it by.
export type TaxAuthorityCard = TaxOfficeDisplay & {
	authorityId: TaxAuthorityId;
};

export const TAX_AUTHORITY_CARDS: TaxAuthorityCard[] = [
	{ ...SLOVENIA_TAX_OFFICE, authorityId: TaxAuthorityId.SLOVENIA },
];
