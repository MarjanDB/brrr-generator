import type { CompanyInfo, Country, InfoProvider } from "@brrr/InfoProviders/InfoProvider";

export class PredefinedInfoProvider implements InfoProvider {
	private readonly companies = new Map<string, CompanyInfo>();
	private readonly countries = new Map<string, Country>();

	getCompanyInfo(isin: string): Promise<CompanyInfo | null> {
		return Promise.resolve(this.companies.get(isin) ?? null);
	}

	getCountry(name: string): Promise<Country | null> {
		return Promise.resolve(this.countries.get(name) ?? null);
	}

	addCompany(isin: string, info: CompanyInfo): void {
		this.companies.set(isin, info);
	}

	updateCompany(isin: string, info: CompanyInfo): void {
		this.companies.set(isin, info);
	}

	removeCompany(isin: string): void {
		this.companies.delete(isin);
	}

	listCompanies(): Map<string, CompanyInfo> {
		return this.companies;
	}

	addCountry(name: string, country: Country): void {
		this.countries.set(name, country);
	}

	updateCountry(name: string, country: Country): void {
		this.countries.set(name, country);
	}

	removeCountry(name: string): void {
		this.countries.delete(name);
	}

	listCountries(): Map<string, Country> {
		return this.countries;
	}
}
