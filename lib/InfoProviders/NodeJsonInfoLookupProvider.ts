import {
	type CompanyInfo,
	type CompanyLocationInfo,
	type Country,
	type InfoProvider,
	TreatyType,
} from "@brrr/InfoProviders/InfoLookupProvider.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(relativePath: string): unknown {
	const fullPath = path.join(__dirname, relativePath);
	const content = fs.readFileSync(fullPath, "utf-8");
	return JSON.parse(content);
}

const internationalTreaties = readJson("internationalTreaties.json");
const specialCountryMappings = readJson("specialCountryMappings.json");
const missingISINLookup = readJson("missingISINLookup.json");
const missingCompaniesLookup = readJson("missingCompaniesLookup.json");

const problematicCountryMappings = specialCountryMappings as Record<string, string>;
const taxReliefTreaties = (internationalTreaties as { treaties: { taxRelief: Record<string, string> } }).treaties
	.taxRelief;

// ISO 3166-1 country name → alpha-2 code (subset of common countries; extend as needed)
const ISO_COUNTRY_NAME_TO_ALPHA2: Record<string, string> = {
	"Afghanistan": "AF",
	"Albania": "AL",
	"Algeria": "DZ",
	"Andorra": "AD",
	"Angola": "AO",
	"Argentina": "AR",
	"Armenia": "AM",
	"Australia": "AU",
	"Austria": "AT",
	"Azerbaijan": "AZ",
	"Bahrain": "BH",
	"Bangladesh": "BD",
	"Belarus": "BY",
	"Belgium": "BE",
	"Benin": "BJ",
	"Bolivia": "BO",
	"Bosnia and Herzegovina": "BA",
	"Brazil": "BR",
	"Bulgaria": "BG",
	"Cambodia": "KH",
	"Cameroon": "CM",
	"Canada": "CA",
	"Chile": "CL",
	"China": "CN",
	"Colombia": "CO",
	"Croatia": "HR",
	"Cyprus": "CY",
	"Czech Republic": "CZ",
	"Czechia": "CZ",
	"Denmark": "DK",
	"Ecuador": "EC",
	"Egypt": "EG",
	"Estonia": "EE",
	"Ethiopia": "ET",
	"Finland": "FI",
	"France": "FR",
	"Georgia": "GE",
	"Germany": "DE",
	"Ghana": "GN",
	"Greece": "GR",
	"Guatemala": "GT",
	"Hong Kong": "HK",
	"Hungary": "HU",
	"Iceland": "IS",
	"India": "IN",
	"Indonesia": "ID",
	"Iran": "IR",
	"Iraq": "IQ",
	"Ireland": "IE",
	"Israel": "IL",
	"Italy": "IT",
	"Japan": "JP",
	"Jordan": "JO",
	"Kazakhstan": "KZ",
	"Kenya": "KE",
	"Kuwait": "KW",
	"Latvia": "LV",
	"Lebanon": "LB",
	"Lithuania": "LT",
	"Luxembourg": "LU",
	"Malaysia": "MY",
	"Malta": "MT",
	"Mexico": "MX",
	"Moldova": "MD",
	"Morocco": "MA",
	"Netherlands": "NL",
	"New Zealand": "NZ",
	"Nigeria": "NG",
	"North Macedonia": "MK",
	"Norway": "NO",
	"Oman": "OM",
	"Pakistan": "PK",
	"Panama": "PA",
	"Peru": "PE",
	"Philippines": "PH",
	"Poland": "PL",
	"Portugal": "PT",
	"Qatar": "QA",
	"Romania": "RO",
	"Russia": "RU",
	"Russian Federation": "RU",
	"Saudi Arabia": "SA",
	"Serbia": "RS",
	"Singapore": "SG",
	"Slovakia": "SK",
	"Slovenia": "SI",
	"South Korea": "KR",
	"Republic of Korea": "KR",
	"Spain": "ES",
	"Sri Lanka": "LK",
	"Sweden": "SE",
	"Switzerland": "CH",
	"Taiwan": "TW",
	"Thailand": "TH",
	"Turkey": "TR",
	"Turkiye": "TR",
	"Ukraine": "UA",
	"United Arab Emirates": "AE",
	"United Kingdom": "GB",
	"United States": "US",
	"Uruguay": "UY",
	"Venezuela": "VE",
	"Vietnam": "VN",
	"Zambia": "ZM",
	"Zimbabwe": "ZW",
};

const isinToTickerLookup = missingISINLookup as Record<string, string>;
const isinToCompanyLookup = missingCompaniesLookup as Record<
	string,
	{
		shortName: string;
		longName: string;
		address1: string;
		address2?: string;
		city: string;
		zip: string;
		country: string;
		state?: string;
	}
>;

export class NodeJsonCountryLookupProvider {
	getCountry(country: string): Promise<Country | null> {
		let shortCode: string | undefined;
		if (problematicCountryMappings[country] !== undefined) {
			shortCode = problematicCountryMappings[country];
		} else if (ISO_COUNTRY_NAME_TO_ALPHA2[country] !== undefined) {
			shortCode = ISO_COUNTRY_NAME_TO_ALPHA2[country];
		}

		if (shortCode === undefined) {
			return Promise.resolve(null);
		}

		const treaties = new Map<TreatyType, string>();
		if (taxReliefTreaties[shortCode] !== undefined) {
			treaties.set(TreatyType.TaxRelief, taxReliefTreaties[shortCode]);
		}

		const result: Country = { name: country, shortCode2: shortCode, treaties };
		return Promise.resolve(result);
	}
}

export class NodeJsonCompanyLookupProvider implements InfoProvider {
	private readonly countryLookup = new NodeJsonCountryLookupProvider();

	getCountry(country: string): Promise<Country | null> {
		return this.countryLookup.getCountry(country);
	}

	async getCompanyInfo(isin: string): Promise<CompanyInfo | null> {
		const companyData = isinToCompanyLookup[isin] ?? isinToCompanyLookup[isinToTickerLookup[isin] ?? ""];

		if (companyData === undefined) {
			return null;
		}

		const countryDef = await this.countryLookup.getCountry(companyData.country);
		if (countryDef === null) {
			return null;
		}

		const location: CompanyLocationInfo = {
			country: companyData.country,
			address1: companyData.address1,
			address2: companyData.address2 ?? null,
			zipCode: companyData.zip,
			city: companyData.city,
			state: companyData.state ?? null,
			shortCodeCountry2: countryDef.shortCode2,
		};

		const result: CompanyInfo = {
			shortName: companyData.shortName,
			longName: companyData.longName,
			location,
		};

		return Promise.resolve(result);
	}
}
