import { DateTime } from "luxon";
import { z } from "zod/v4";

export type ValidDateTime = DateTime<true>;

export const zDateTime = z.custom<ValidDateTime>((value) => {
	if (!(value instanceof DateTime)) {
		return false;
	}

	return value.isValid;
});
