export type TaxAuthorityCard = {
	authorityId: string;
	name: string;
	country: string;
	iconUrl: string;
};

export const TAX_AUTHORITY_CARDS: TaxAuthorityCard[] = [
	{
		authorityId: "slovenia",
		name: "Finančna uprava Republike Slovenije",
		country: "Slovenia",
		iconUrl: "/icons/tax-authorities/edavki.svg",
	},
];
