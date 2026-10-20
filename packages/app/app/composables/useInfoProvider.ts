import {
	type CompanyInfo,
	type Country,
	type IInfoProvider,
	PredefinedInfoProvider,
	TreatyType,
} from "@brrr/lib";

// The country route's JSON: a Country with its treaties as a plain object.
type SerializedCountry = Omit<Country, "treaties"> & { treaties: Record<string, string> };

// What the site asks of its lookups: lib's IInfoProvider, which the pipeline is built with, and the
// predefined lookups' plain-string entries.
type SiteInfoProvider = IInfoProvider &
	Pick<PredefinedInfoProvider, "defineCompany" | "getCompanyInfo" | "getCountry">;

// The lookups the site's pipeline makes. A payer defined by hand, or a company or country already
// asked about, is answered in the browser; anything else is asked of the server's lookup routes
// and kept. Each call makes lookups of their own.
export function useInfoProvider(): SiteInfoProvider {
	const predefined = new PredefinedInfoProvider();

	async function getCompanyInfo(isin: string): Promise<CompanyInfo | null> {
		const local = await predefined.getCompanyInfo(isin);
		if (local) return local;

		const result = await $fetch<CompanyInfo | null>(`/api/isin/${isin}`);
		if (result) predefined.addCompany(isin, result);

		return result;
	}

	async function getCountry(name: string): Promise<Country | null> {
		const local = await predefined.getCountry(name);
		if (local) return local;

		const result = await $fetch<SerializedCountry | null>(
			`/api/country/${encodeURIComponent(name)}`,
		);
		if (!result) return null;

		const treaties = new Map<TreatyType, string>();
		for (const [key, value] of Object.entries(result.treaties)) {
			const treaty = Object.values(TreatyType).find((type) => type === key);
			if (treaty !== undefined) {
				treaties.set(treaty, value);
			}
		}

		const country: Country = { name: result.name, shortCode2: result.shortCode2, treaties };

		predefined.addCountry(name, country);

		return country;
	}

	return {
		getCompanyInfo,
		getCountry,
		// A payer defined by hand, which the lookup gives before asking the server.
		defineCompany: (definition) => predefined.defineCompany(definition),
		addCompany: (isin, info) => predefined.addCompany(isin, info),
		updateCompany: (isin, info) => predefined.updateCompany(isin, info),
		removeCompany: (isin) => predefined.removeCompany(isin),
		listCompanies: () => predefined.listCompanies(),
		addCountry: (name, country) => predefined.addCountry(name, country),
		updateCountry: (name, country) => predefined.updateCountry(name, country),
		removeCountry: (name) => predefined.removeCountry(name),
		listCountries: () => predefined.listCountries(),
	};
}
