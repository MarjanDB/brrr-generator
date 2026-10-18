import type { Nominal } from "@brrr/Utils/NominalType";
import { z } from "zod/v4";

// What the site and the CLI ask the tax authority registry by.

export enum TaxAuthorityId {
	SLOVENIA = "slovenia",
}

// A report type of some tax authority; each authority turns its own report type IDs into these.
export type ReportTypeId = Nominal<string, "TaxAuthorities.ReportTypeId">;
export const ReportTypeId = {
	Schema: z.string().transform((value) => value as ReportTypeId),
};
