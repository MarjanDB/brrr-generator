import type {
	ReportTypeId,
	TaxAuthorityId,
} from "@brrr/TaxAuthorities/Models/TaxAuthorityIdentifiers";

export type TaxAuthorityDescriptor = {
	authorityId: TaxAuthorityId;
	displayName: string;
	reportTypes: { reportTypeId: ReportTypeId; displayName: string }[];
};
