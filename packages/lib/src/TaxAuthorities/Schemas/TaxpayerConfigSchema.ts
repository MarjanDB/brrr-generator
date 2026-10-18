import { TaxpayerType } from "@brrr/TaxAuthorities/Schemas/TaxpayerType";
import { zDateTimeFromISOString } from "@brrr/Utils/DateTime";
import { z } from "zod/v4";

// eDavki's taxpayer block (taxPayerType in EDP-Common-1.xsd) field for field, so the field names are
// eDavki's own, `maticnaStevilka` and `invalidskoPodjetje` included.
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
