import type { DateTime } from "luxon";

export enum TaxPayerType {
	PHYSICAL_SUBJECT = "FO",
	LAW_SUBJECT = "PO",
	PHYSICAL_SUBJECT_WITH_ACTIVITY = "SP",
}

export type TaxPayerInfo = {
	taxNumber: string;
	taxpayerType: TaxPayerType;
	name: string;
	address1: string;
	address2: string | null;
	city: string;
	postNumber: string;
	postName: string;
	municipalityName: string;
	birthDate: DateTime;
	maticnaStevilka: string;
	invalidskoPodjetje: boolean;
	resident: boolean;
	activityCode: string;
	activityName: string;
	countryId: string;
	countryName: string;
};

export enum TaxAuthorityLotMatchingMethod {
	NONE = "NONE",
	PROVIDED = "PROVIDED",
	FIFO = "FIFO",
}

export type TaxAuthorityConfiguration = {
	fromDate: DateTime;
	toDate: DateTime;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
};
