import { DateTime } from "luxon";
import { z } from "zod/v4";

export type ValidDateTime = DateTime<true>;

export const zDateTime = z.custom<ValidDateTime>((value) => {
	if (!(value instanceof DateTime)) {
		return false;
	}

	return value.isValid;
});

export const zDateTimeFromISOString = z.string().transform((s, ctx) => {
	const dt = DateTime.fromISO(s);
	if (!dt.isValid) {
		ctx.addIssue({ code: "custom", message: `Invalid ISO date string: ${s}` });
		return z.NEVER;
	}
	return dt as ValidDateTime;
});
