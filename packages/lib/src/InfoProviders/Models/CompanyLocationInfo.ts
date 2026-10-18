import type { CountryCode, CountryName } from "@brrr/Core/Models/Identifiers";

export type CompanyLocationInfo = {
	country: CountryName;
	address1: string;
	address2: string | null;
	zipCode: string;
	city: string;
	state: string | null;
	shortCodeCountry2: CountryCode;
};
