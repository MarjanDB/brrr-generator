import type { CountryCode, CountryName, Isin } from "@brrr/Core/Schemas/Identifiers";

export enum TreatyType {
	TaxRelief = "TAX_RELIEF",
}

export type Country = {
	name: CountryName;
	shortCode2: CountryCode;
	treaties: Map<TreatyType, string>;
};

export type CompanyLocationInfo = {
	country: CountryName;
	address1: string;
	address2: string | null;
	zipCode: string;
	city: string;
	state: string | null;
	shortCodeCountry2: CountryCode;
};

export type CompanyInfo = {
	shortName: string;
	longName: string;
	location: CompanyLocationInfo;
};

export interface IInfoProvider {
	getCountry(country: CountryName): Promise<Country | null>;
	getCompanyInfo(isin: Isin): Promise<CompanyInfo | null>;

	// Country overrides
	addCountry(name: CountryName, country: Country): void;
	updateCountry(name: CountryName, country: Country): void;
	removeCountry(name: CountryName): void;
	listCountries(): Map<CountryName, Country>;

	// Company overrides
	addCompany(isin: Isin, info: CompanyInfo): void;
	updateCompany(isin: Isin, info: CompanyInfo): void;
	removeCompany(isin: Isin): void;
	listCompanies(): Map<Isin, CompanyInfo>;
}

export const IInfoProvider = {
	Token: Symbol("IInfoProvider"),
};
