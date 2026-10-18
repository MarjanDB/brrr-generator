import type { CountryName, Isin } from "@brrr/Core/Models/Identifiers";
import type { CompanyInfo } from "@brrr/InfoProviders/Models/CompanyInfo";
import type { Country } from "@brrr/InfoProviders/Models/Country";

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
