import internationalTreaties from "./internationalTreaties.json" with { type: "json" };
import specialCountryMappings from "./specialCountryMappings.json" with { type: "json" };
import missingISINLookup from "./missingISINLookup.json" with { type: "json" };
import missingCompaniesLookup from "./missingCompaniesLookup.json" with { type: "json" };

export enum TreatyType {
	TaxRelief = "TAX_RELIEF",
}

export type Country = {
	name: string;
	shortCode2: string;
	treaties: Map<TreatyType, string>;
};

export type CompanyLocationInfo = {
	country: string;
	address1: string;
	address2: string | null;
	zipCode: string;
	city: string;
	state: string | null;
	shortCodeCountry2: string;
};

export type CompanyInfo = {
	shortName: string;
	longName: string;
	location: CompanyLocationInfo;
};

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

export class CountryLookupProvider {
	getCountry(country: string): Country {
		let shortCode: string;
		if (problematicCountryMappings[country] !== undefined) {
			shortCode = problematicCountryMappings[country];
		} else if (ISO_COUNTRY_NAME_TO_ALPHA2[country] !== undefined) {
			shortCode = ISO_COUNTRY_NAME_TO_ALPHA2[country];
		} else {
			throw new Error(`Unknown country: ${country}. Add it to specialCountryMappings.json`);
		}

		const treaties = new Map<TreatyType, string>();
		if (taxReliefTreaties[shortCode] !== undefined) {
			treaties.set(TreatyType.TaxRelief, taxReliefTreaties[shortCode]);
		}

		return { name: country, shortCode2: shortCode, treaties };
	}
}

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

const countryLookupInstance = new CountryLookupProvider();

export class CompanyLookupProvider {
	getCompanyInfo(isin: string): CompanyInfo {
		const companyData = isinToCompanyLookup[isin] ?? isinToCompanyLookup[isinToTickerLookup[isin] ?? ""];

		if (companyData === undefined) {
			throw new Error(`Failed lookup of ISIN (${isin})`);
		}

		const countryDef = countryLookupInstance.getCountry(companyData.country);

		const location: CompanyLocationInfo = {
			country: companyData.country,
			address1: companyData.address1,
			address2: companyData.address2 ?? null,
			zipCode: companyData.zip,
			city: companyData.city,
			state: companyData.state ?? null,
			shortCodeCountry2: countryDef.shortCode2,
		};

		return {
			shortName: companyData.shortName,
			longName: companyData.longName,
			location,
		};
	}
}
