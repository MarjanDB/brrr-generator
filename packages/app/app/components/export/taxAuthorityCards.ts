import { TaxAuthorityId } from "@brrr/lib";

export type TaxAuthorityCard = {
	authorityId: TaxAuthorityId;
	name: string;
	country: string;
	iconUrl: string;
};

export const TAX_AUTHORITY_CARDS: TaxAuthorityCard[] = [
	{
		authorityId: TaxAuthorityId.SLOVENIA,
		name: "Finančna uprava Republike Slovenije",
		country: "Slovenia",
		iconUrl: "/icons/tax-authorities/edavki.svg",
	},
];
