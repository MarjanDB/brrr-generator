import { type ValidDateTime, zDateTimeFromISOString } from "@brrr/Utils/DateTime.ts";
import { z } from "zod/v4";

export enum TaxPayerType {
	PHYSICAL_SUBJECT = "FO",
	LAW_SUBJECT = "PO",
	PHYSICAL_SUBJECT_WITH_ACTIVITY = "SP",
}

export const TaxPayerConfigSchema = z.object({
	taxNumber: z.string(),
	taxpayerType: z.enum(TaxPayerType),
	name: z.string(),
	address1: z.string(),
	address2: z.string().nullable(),
	city: z.string(),
	postNumber: z.string(),
	postName: z.string(),
	municipalityName: z.string(),
	birthDate: zDateTimeFromISOString,
	maticnaStevilka: z.string(),
	invalidskoPodjetje: z.boolean(),
	resident: z.boolean(),
	activityCode: z.string(),
	activityName: z.string(),
	countryId: z.string(),
	countryName: z.string(),
});

export type TaxPayerInfo = z.infer<typeof TaxPayerConfigSchema>;

export enum TaxAuthorityLotMatchingMethod {
	NONE = "NONE",
	PROVIDED = "PROVIDED",
	FIFO = "FIFO",
}

export type TaxAuthorityConfiguration = {
	fromDate: ValidDateTime;
	toDate: ValidDateTime;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
};
