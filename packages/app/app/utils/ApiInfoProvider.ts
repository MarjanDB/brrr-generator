import type { CompanyInfo, Country, InfoProvider, Isin } from "@brrr/lib";
import { CountryCode, CountryName, PredefinedInfoProvider, type TreatyType } from "@brrr/lib";

type SerializedCountry = { name: string; shortCode2: string; treaties: Record<string, string> };

export class ApiInfoProvider implements InfoProvider {
	private readonly predefined = new PredefinedInfoProvider();

	async getCompanyInfo(isin: Isin): Promise<CompanyInfo | null> {
		const local = await this.predefined.getCompanyInfo(isin);
		if (local) return local;

		const result = await $fetch<CompanyInfo | null>(`/api/isin/${isin}`);
		if (result) this.predefined.addCompany(isin, result);

		return result;
	}

	async getCountry(name: CountryName): Promise<Country | null> {
		const local = await this.predefined.getCountry(name);
		if (local) return local;

		const result = await $fetch<SerializedCountry | null>(
			`/api/country/${encodeURIComponent(name)}`,
		);
		if (!result) return null;

		const treaties = new Map<TreatyType, string>();
		for (const [k, v] of Object.entries(result.treaties)) {
			treaties.set(k as TreatyType, v);
		}

		const country: Country = {
			name: CountryName.Schema.parse(result.name),
			shortCode2: CountryCode.Schema.parse(result.shortCode2),
			treaties,
		};

		this.predefined.addCountry(name, country);

		return country;
	}

	addCompany(isin: Isin, info: CompanyInfo): void {
		this.predefined.addCompany(isin, info);
	}
	updateCompany(isin: Isin, info: CompanyInfo): void {
		this.predefined.updateCompany(isin, info);
	}
	removeCompany(isin: Isin): void {
		this.predefined.removeCompany(isin);
	}
	listCompanies(): Map<Isin, CompanyInfo> {
		return this.predefined.listCompanies();
	}
	addCountry(name: CountryName, country: Country): void {
		this.predefined.addCountry(name, country);
	}
	updateCountry(name: CountryName, country: Country): void {
		this.predefined.updateCountry(name, country);
	}
	removeCountry(name: CountryName): void {
		this.predefined.removeCountry(name);
	}
	listCountries(): Map<CountryName, Country> {
		return this.predefined.listCountries();
	}
}
