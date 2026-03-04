import type { TaxPayerInfo } from "@brrr/lib";
import { TaxPayerType } from "@brrr/lib";
import { DateTime } from "luxon";
import { z } from "zod";

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
	birthDate: z.string().refine((s) => DateTime.fromISO(s).isValid, {
		message: "birthDate must be a valid ISO date string (e.g. 1990-01-01)",
	}),
	maticnaStevilka: z.string(),
	invalidskoPodjetje: z.boolean(),
	resident: z.boolean(),
	activityCode: z.string(),
	activityName: z.string(),
	countryId: z.string(),
	countryName: z.string(),
});

export type TaxPayerConfig = z.infer<typeof TaxPayerConfigSchema>;

export function toTaxPayerInfo(config: TaxPayerConfig): TaxPayerInfo {
	return {
		...config,
		birthDate: DateTime.fromISO(config.birthDate),
	};
}
