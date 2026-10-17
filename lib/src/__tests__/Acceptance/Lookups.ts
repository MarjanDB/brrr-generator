import { TreatyType } from "@brrr/InfoProviders/InfoProvider";

// The company and country lookups the IBKR dividend cases' expected files were generated with.
export const Lookups = {
	companies: {
		FR0000120271: {
			shortName: "TotalEnergies",
			longName: "TotalEnergies SE",
			location: {
				country: "France",
				address1: "2 Place Jean Millier",
				address2: null,
				zipCode: "92400",
				city: "Courbevoie",
				state: null,
				shortCodeCountry2: "FR",
			},
		},
		US5801351017: {
			shortName: "McDonald's",
			longName: "McDonald's Corporation",
			location: {
				country: "United States",
				address1: "110 North Carpenter Street",
				address2: null,
				zipCode: "60607",
				city: "Chicago",
				state: "IL",
				shortCodeCountry2: "US",
			},
		},
	},
	countries: {
		France: {
			name: "France",
			shortCode2: "FR",
			treaties: new Map([[TreatyType.TaxRelief, "Article 10"]]),
		},
		"United States": {
			name: "United States",
			shortCode2: "US",
			treaties: new Map([[TreatyType.TaxRelief, "Article 10"]]),
		},
	},
};
