import { CountryCode, CountryName, Isin } from "@brrr/Core/Models/Identifiers";
import type { IInfoProvider } from "@brrr/InfoProviders/Interfaces/IInfoProvider";
import type { CompanyInfo } from "@brrr/InfoProviders/Models/CompanyInfo";
import type { Country } from "@brrr/InfoProviders/Models/Country";

// A company someone defines by hand, where the lookup found none: what a dividend form needs of it.
export type CompanyDefinition = {
	isin: string;
	name: string;
	street: string;
	city: string;
	countryName: string;
	countryCode: string;
};

// Takes plain strings, so the site and the CLI can use it without building lib's identifiers.
export class PredefinedInfoProvider implements IInfoProvider {
	private readonly companies = new Map<Isin, CompanyInfo>();
	private readonly countries = new Map<CountryName, Country>();

	public getCompanyInfo(isin: string): Promise<CompanyInfo | null> {
		return Promise.resolve(this.companies.get(Isin.Schema.parse(isin)) ?? null);
	}

	public getCountry(name: string): Promise<Country | null> {
		return Promise.resolve(this.countries.get(CountryName.Schema.parse(name)) ?? null);
	}

	public addCompany(isin: string, info: CompanyInfo): void {
		this.companies.set(Isin.Schema.parse(isin), info);
	}

	public defineCompany(definition: CompanyDefinition): void {
		this.companies.set(Isin.Schema.parse(definition.isin), {
			shortName: definition.name,
			longName: definition.name,
			location: {
				country: CountryName.Schema.parse(definition.countryName),
				address1: definition.street,
				address2: null,
				zipCode: "",
				city: definition.city,
				state: null,
				shortCodeCountry2: CountryCode.Schema.parse(definition.countryCode),
			},
		});
	}

	public updateCompany(isin: string, info: CompanyInfo): void {
		this.companies.set(Isin.Schema.parse(isin), info);
	}

	public removeCompany(isin: string): void {
		this.companies.delete(Isin.Schema.parse(isin));
	}

	public listCompanies(): Map<Isin, CompanyInfo> {
		return this.companies;
	}

	public addCountry(name: string, country: Country): void {
		this.countries.set(CountryName.Schema.parse(name), country);
	}

	public updateCountry(name: string, country: Country): void {
		this.countries.set(CountryName.Schema.parse(name), country);
	}

	public removeCountry(name: string): void {
		this.countries.delete(CountryName.Schema.parse(name));
	}

	public listCountries(): Map<CountryName, Country> {
		return this.countries;
	}
}
