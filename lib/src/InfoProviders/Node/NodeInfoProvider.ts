import {
	type CompanyInfo,
	type CompanyLocationInfo,
	type Country,
	type InfoProvider,
	TreatyType,
} from "@brrr/InfoProviders/InfoProvider.js";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider.js";
import YahooFinance from "yahoo-finance2";
import internationalTreaties from "./internationalTreaties.json" with { type: "json" };
import missingCompaniesLookup from "./missingCompaniesLookup.json" with { type: "json" };
import missingISINLookup from "./missingISINLookup.json" with { type: "json" };
import specialCountryMappings from "./specialCountryMappings.json" with { type: "json" };

const problematicCountryMappings = specialCountryMappings as Record<string, string>;
const taxReliefTreaties = (
	internationalTreaties as { treaties: { taxRelief: Record<string, string> } }
).treaties.taxRelief;

// ISO 3166-1 country name → alpha-2 code (subset of common countries; extend as needed)
const ISO_COUNTRY_NAME_TO_ALPHA2: Record<string, string> = {
	Afghanistan: "AF",
	Albania: "AL",
	Algeria: "DZ",
	Andorra: "AD",
	Angola: "AO",
	Argentina: "AR",
	Armenia: "AM",
	Australia: "AU",
	Austria: "AT",
	Azerbaijan: "AZ",
	Bahrain: "BH",
	Bangladesh: "BD",
	Belarus: "BY",
	Belgium: "BE",
	Benin: "BJ",
	Bolivia: "BO",
	"Bosnia and Herzegovina": "BA",
	Brazil: "BR",
	Bulgaria: "BG",
	Cambodia: "KH",
	Cameroon: "CM",
	Canada: "CA",
	Chile: "CL",
	China: "CN",
	Colombia: "CO",
	Croatia: "HR",
	Cyprus: "CY",
	"Czech Republic": "CZ",
	Czechia: "CZ",
	Denmark: "DK",
	Ecuador: "EC",
	Egypt: "EG",
	Estonia: "EE",
	Ethiopia: "ET",
	Finland: "FI",
	France: "FR",
	Georgia: "GE",
	Germany: "DE",
	Ghana: "GN",
	Greece: "GR",
	Guatemala: "GT",
	"Hong Kong": "HK",
	Hungary: "HU",
	Iceland: "IS",
	India: "IN",
	Indonesia: "ID",
	Iran: "IR",
	Iraq: "IQ",
	Ireland: "IE",
	Israel: "IL",
	Italy: "IT",
	Japan: "JP",
	Jordan: "JO",
	Kazakhstan: "KZ",
	Kenya: "KE",
	Kuwait: "KW",
	Latvia: "LV",
	Lebanon: "LB",
	Lithuania: "LT",
	Luxembourg: "LU",
	Malaysia: "MY",
	Malta: "MT",
	Mexico: "MX",
	Moldova: "MD",
	Morocco: "MA",
	Netherlands: "NL",
	"New Zealand": "NZ",
	Nigeria: "NG",
	"North Macedonia": "MK",
	Norway: "NO",
	Oman: "OM",
	Pakistan: "PK",
	Panama: "PA",
	Peru: "PE",
	Philippines: "PH",
	Poland: "PL",
	Portugal: "PT",
	Qatar: "QA",
	Romania: "RO",
	Russia: "RU",
	"Russian Federation": "RU",
	"Saudi Arabia": "SA",
	Serbia: "RS",
	Singapore: "SG",
	Slovakia: "SK",
	Slovenia: "SI",
	"South Korea": "KR",
	"Republic of Korea": "KR",
	Spain: "ES",
	"Sri Lanka": "LK",
	Sweden: "SE",
	Switzerland: "CH",
	Taiwan: "TW",
	Thailand: "TH",
	Turkey: "TR",
	Turkiye: "TR",
	Ukraine: "UA",
	"United Arab Emirates": "AE",
	"United Kingdom": "GB",
	"United States": "US",
	Uruguay: "UY",
	Venezuela: "VE",
	Vietnam: "VN",
	Zambia: "ZM",
	Zimbabwe: "ZW",
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

export class NodeInfoProvider implements InfoProvider {
	private readonly predefined = new PredefinedInfoProvider();
	private readonly yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

	// Override methods — forward to predefined
	addCompany(isin: string, info: CompanyInfo): void {
		this.predefined.addCompany(isin, info);
	}

	updateCompany(isin: string, info: CompanyInfo): void {
		this.predefined.updateCompany(isin, info);
	}

	removeCompany(isin: string): void {
		this.predefined.removeCompany(isin);
	}

	listCompanies(): Map<string, CompanyInfo> {
		return this.predefined.listCompanies();
	}

	addCountry(name: string, country: Country): void {
		this.predefined.addCountry(name, country);
	}

	updateCountry(name: string, country: Country): void {
		this.predefined.updateCountry(name, country);
	}

	removeCountry(name: string): void {
		this.predefined.removeCountry(name);
	}

	listCountries(): Map<string, Country> {
		return this.predefined.listCountries();
	}

	async getCountry(name: string): Promise<Country | null> {
		// 1. Check predefined
		const fromPredefined = await this.predefined.getCountry(name);
		if (fromPredefined !== null) {
			return fromPredefined;
		}

		// 2. Check problematicCountryMappings / ISO lookup
		let shortCode: string | undefined;
		if (problematicCountryMappings[name] !== undefined) {
			shortCode = problematicCountryMappings[name];
		} else if (ISO_COUNTRY_NAME_TO_ALPHA2[name] !== undefined) {
			shortCode = ISO_COUNTRY_NAME_TO_ALPHA2[name];
		}

		if (shortCode === undefined) {
			return null;
		}

		const treaties = new Map<TreatyType, string>();
		if (taxReliefTreaties[shortCode] !== undefined) {
			treaties.set(TreatyType.TaxRelief, taxReliefTreaties[shortCode]);
		}

		return { name, shortCode2: shortCode, treaties };
	}

	async getCompanyInfo(isin: string): Promise<CompanyInfo | null> {
		// 1. Check predefined
		const fromPredefined = await this.predefined.getCompanyInfo(isin);
		if (fromPredefined !== null) {
			return fromPredefined;
		}

		// 2. Check JSON lookups
		const companyData =
			isinToCompanyLookup[isin] ?? isinToCompanyLookup[isinToTickerLookup[isin] ?? ""];

		if (companyData !== undefined) {
			const countryDef = await this.getCountry(companyData.country);
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

			return {
				shortName: companyData.shortName,
				longName: companyData.longName,
				location,
			};
		}

		// 3. Fetch from Yahoo Finance
		try {
			// Yahoo Finance does not support ISIN lookup directly — resolve to ticker first via search
			const searchResult = await this.yf.search(isin);
			const firstQuote = searchResult.quotes.find((q) => q.isYahooFinance);
			if (!firstQuote?.isYahooFinance) {
				return null;
			}

			const shortName = firstQuote.shortname ?? "";
			const longName = firstQuote.longname ?? shortName;

			const result = await this.yf.quoteSummary(firstQuote.symbol, { modules: ["summaryProfile"] });
			const profile = result.summaryProfile;

			if (!profile) {
				return null;
			}

			const countryName = profile.country ?? "";

			const countryDef = countryName ? await this.getCountry(countryName) : null;
			if (countryDef === null) {
				return null;
			}

			const location: CompanyLocationInfo = {
				country: countryName,
				address1: profile?.address1 ?? "",
				address2: profile?.address2 ?? null,
				zipCode: profile?.zip ?? "",
				city: profile?.city ?? "",
				state: profile?.state ?? null,
				shortCodeCountry2: countryDef.shortCode2,
			};

			const companyInfo: CompanyInfo = { shortName, longName, location };

			// Cache into predefined
			this.predefined.addCompany(isin, companyInfo);
			this.predefined.addCountry(countryName, countryDef);

			return companyInfo;
		} catch (ex) {
			console.error(`Failed to fetch company info for ISIN ${isin}: ${ex}`);
			return null;
		}
	}
}
