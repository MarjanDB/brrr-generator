import type { CountryName, Isin } from "@brrr/Core/Schemas/Identifiers";
import type { CompanyInfo, Country, InfoProvider } from "@brrr/InfoProviders/InfoProvider";

export class PredefinedInfoProvider implements InfoProvider {
	private readonly companies = new Map<Isin, CompanyInfo>();
	private readonly countries = new Map<CountryName, Country>();

	getCompanyInfo(isin: Isin): Promise<CompanyInfo | null> {
		return Promise.resolve(this.companies.get(isin) ?? null);
	}

	getCountry(name: CountryName): Promise<Country | null> {
		return Promise.resolve(this.countries.get(name) ?? null);
	}

	addCompany(isin: Isin, info: CompanyInfo): void {
		this.companies.set(isin, info);
	}

	updateCompany(isin: Isin, info: CompanyInfo): void {
		this.companies.set(isin, info);
	}

	removeCompany(isin: Isin): void {
		this.companies.delete(isin);
	}

	listCompanies(): Map<Isin, CompanyInfo> {
		return this.companies;
	}

	addCountry(name: CountryName, country: Country): void {
		this.countries.set(name, country);
	}

	updateCountry(name: CountryName, country: Country): void {
		this.countries.set(name, country);
	}

	removeCountry(name: CountryName): void {
		this.countries.delete(name);
	}

	listCountries(): Map<CountryName, Country> {
		return this.countries;
	}
}
