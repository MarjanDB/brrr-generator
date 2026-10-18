import { type ValidDateTime, zDateTimeFromISOString } from "@brrr/Utils/DateTime";
import { z } from "zod/v4";

export enum TaxpayerType {
	PHYSICAL_SUBJECT = "FO", // "FO" = Fizična Oseba (natural person); see EDP-Common-1 schema
	LAW_SUBJECT = "PO",
	PHYSICAL_SUBJECT_WITH_ACTIVITY = "SP",
}

export const TaxpayerConfigSchema = z.object({
	taxNumber: z.string(),
	taxpayerType: z.enum(TaxpayerType),
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

export type TaxpayerInfo = z.infer<typeof TaxpayerConfigSchema>;

// Lot relief (cost basis) methods. PROVIDED takes the broker's lots, matched by whatever method the
// account uses there (FIFO, LIFO, specific identification, …).
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
