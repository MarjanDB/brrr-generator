import { TaxAuthorityId } from "@brrr/lib";
import type { TaxAuthorityCard } from "~/types/taxOffice";
import { TaxOffices } from "~/utils/taxOffices";

const TAX_AUTHORITY_CARDS: TaxAuthorityCard[] = [
	{ ...TaxOffices.slovenia, authorityId: TaxAuthorityId.SLOVENIA },
];

// The configure step's cards, one per tax office.
export const TaxAuthorityCards = {
	all: TAX_AUTHORITY_CARDS,
};
