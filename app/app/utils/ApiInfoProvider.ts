import type { CompanyInfo, Country, InfoProvider } from "@brrr/lib";
import { PredefinedInfoProvider, TreatyType } from "@brrr/lib";

type SerializedCountry = { name: string; shortCode2: string; treaties: Record<string, string> };

export class ApiInfoProvider implements InfoProvider {
	private readonly predefined = new PredefinedInfoProvider();

	async getCompanyInfo(isin: string): Promise<CompanyInfo | null> {
		const local = await this.predefined.getCompanyInfo(isin);
		if (local) return local;

		const result = await $fetch<CompanyInfo | null>("/api/isin/" + isin);
		if (result) this.predefined.addCompany(isin, result);

		return result;
	}

	async getCountry(name: string): Promise<Country | null> {
		const local = await this.predefined.getCountry(name);
		if (local) return local;

		const result = await $fetch<SerializedCountry | null>("/api/country/" + encodeURIComponent(name));
		if (!result) return null;

		const treaties = new Map<TreatyType, string>();
		for (const [k, v] of Object.entries(result.treaties)) {
			treaties.set(k as TreatyType, v);
		}

		const country: Country = { name: result.name, shortCode2: result.shortCode2, treaties };

		this.predefined.addCountry(name, country);
		
		return country;
	}

	addCompany(isin: string, info: CompanyInfo): void { this.predefined.addCompany(isin, info); }
	updateCompany(isin: string, info: CompanyInfo): void { this.predefined.updateCompany(isin, info); }
	removeCompany(isin: string): void { this.predefined.removeCompany(isin); }
	listCompanies(): Map<string, CompanyInfo> { return this.predefined.listCompanies(); }
	addCountry(name: string, country: Country): void { this.predefined.addCountry(name, country); }
	updateCountry(name: string, country: Country): void { this.predefined.updateCountry(name, country); }
	removeCountry(name: string): void { this.predefined.removeCountry(name); }
	listCountries(): Map<string, Country> { return this.predefined.listCountries(); }
}
