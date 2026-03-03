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

export interface InfoProvider {
	getCountry(country: string): Promise<Country | null>;
	getCompanyInfo(isin: string): Promise<CompanyInfo | null>;
}

export const InfoProvider = {
	Token: Symbol("InfoProvider"),
};
