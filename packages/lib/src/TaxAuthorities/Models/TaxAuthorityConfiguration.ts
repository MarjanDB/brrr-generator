import type { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export type TaxAuthorityConfiguration = {
	fromDate: ValidDateTime;
	toDate: ValidDateTime;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
};
