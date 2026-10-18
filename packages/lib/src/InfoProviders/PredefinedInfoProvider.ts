import { CountryName, Isin } from "@brrr/Core/Schemas/Identifiers";
import type { CompanyInfo, Country, IInfoProvider } from "@brrr/InfoProviders/IInfoProvider";

// Takes plain strings, so the site and the CLI can use it without building lib's identifiers.
export class PredefinedInfoProvider implements IInfoProvider {
	private readonly companies = new Map<Isin, CompanyInfo>();
	private readonly countries = new Map<CountryName, Country>();

	getCompanyInfo(isin: string): Promise<CompanyInfo | null> {
		return Promise.resolve(this.companies.get(Isin.Schema.parse(isin)) ?? null);
	}

	getCountry(name: string): Promise<Country | null> {
		return Promise.resolve(this.countries.get(CountryName.Schema.parse(name)) ?? null);
	}

	addCompany(isin: string, info: CompanyInfo): void {
		this.companies.set(Isin.Schema.parse(isin), info);
	}

	updateCompany(isin: string, info: CompanyInfo): void {
		this.companies.set(Isin.Schema.parse(isin), info);
	}

	removeCompany(isin: string): void {
		this.companies.delete(Isin.Schema.parse(isin));
	}

	listCompanies(): Map<Isin, CompanyInfo> {
		return this.companies;
	}

	addCountry(name: string, country: Country): void {
		this.countries.set(CountryName.Schema.parse(name), country);
	}

	updateCountry(name: string, country: Country): void {
		this.countries.set(CountryName.Schema.parse(name), country);
	}

	removeCountry(name: string): void {
		this.countries.delete(CountryName.Schema.parse(name));
	}

	listCountries(): Map<CountryName, Country> {
		return this.countries;
	}
}
