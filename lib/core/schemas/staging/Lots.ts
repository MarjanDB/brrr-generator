import type { DateTime } from "luxon";
import type { GenericShortLong } from "@brrr/core/schemas/CommonFormats.ts";
import type { StagingFinancialIdentifier } from "./StagingFinancialIdentifier.ts";

export type StagingTaxLotMatchingDetails = {
	id: string | null;
	dateTime: DateTime | null;
};

export type StagingTaxLot = {
	id: string;
	financialIdentifier: StagingFinancialIdentifier;
	quantity: number;
	acquired: StagingTaxLotMatchingDetails;
	sold: StagingTaxLotMatchingDetails;
	shortLongType: GenericShortLong;
};
