import { DateTime } from "luxon";
import { z } from "zod/v4";

export type ValidDateTime = DateTime<true>;

export const zDateTime = z.custom<ValidDateTime>((value) => {
	if (!(value instanceof DateTime)) {
		return false;
	}

	return value.isValid;
});

export const zDateTimeFromISOString = z.union([z.string(), z.date()]).transform((val, ctx) => {
	const dt = val instanceof Date ? DateTime.fromJSDate(val) : DateTime.fromISO(val);
	if (!dt.isValid) {
		ctx.addIssue({ code: "custom", message: `Invalid date value: ${val}` });
		return z.NEVER;
	}
	return dt as ValidDateTime;
});
