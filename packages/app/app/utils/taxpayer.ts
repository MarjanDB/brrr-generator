import { TaxpayerConfigSchema, type TaxpayerInfo, TaxpayerType } from "@brrr/lib";
import type { TaxpayerDetails } from "~/types/taxYearReports";

// The taxpayer block a form's XML is written with, from what the download asked for. The XML's
// header takes the tax number, name and address, and its residency the country; the rest of the
// block isn't written into any form, so it is fixed.
export function taxpayerInfoOf(details: TaxpayerDetails): TaxpayerInfo {
	return TaxpayerConfigSchema.parse({
		taxNumber: details.taxNumber,
		taxpayerType: TaxpayerType.NATURAL_PERSON,
		name: details.name,
		address1: details.address,
		address2: null,
		city: details.city,
		postNumber: details.postNumber,
		postName: details.postName,
		municipalityName: "",
		birthDate: "1990-01-01",
		maticnaStevilka: "",
		invalidskoPodjetje: false,
		resident: details.countryId === "SI",
		activityCode: "",
		activityName: "",
		countryId: details.countryId,
		countryName: "",
	});
}
