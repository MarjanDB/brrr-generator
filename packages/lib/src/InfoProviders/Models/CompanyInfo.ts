import type { CompanyLocationInfo } from "@brrr/InfoProviders/Models/CompanyLocationInfo";

export type CompanyInfo = {
	shortName: string;
	longName: string;
	location: CompanyLocationInfo;
};
