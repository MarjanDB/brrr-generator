import type { IbkrCodes } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrCodes";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";
import { z } from "zod/v4";

// The field parsers and helpers the row schemas share.

export const zStrNullable = z.string().transform((s) => (s === "" ? null : s));
export const zNumNullable = z.string().transform((s) => (s === "" ? null : parseFloat(s)));

const DATE_FORMATS = [
	"yyyy-MM-dd HH:mm:ss ZZ",
	"yyyy-MM-dd;HH:mm:ss ZZ",
	"yyyy-MM-dd",
	"yyyyMMdd;HHmmss",
	"yyyyMMdd",
];

function parseDateString(s: string, ctx: z.RefinementCtx): ValidDateTime {
	const normalized = s.replace("EDT", "-04:00").replace("EST", "-05:00");
	for (const fmt of DATE_FORMATS) {
		const parsed = DateTime.fromFormat(normalized, fmt);
		if (parsed.isValid) return parsed;
	}
	const iso = DateTime.fromISO(normalized);
	if (iso.isValid) return iso;
	ctx.addIssue({ code: "custom", message: `Could not parse date: ${s}` });
	return z.NEVER;
}

export const zDateTime = z.string().transform(parseDateString);

export const zDateTimeNullable = z.string().transform((s, ctx): ValidDateTime | null => {
	if (s === "") return null;
	return parseDateString(s, ctx);
});

export const zNotes = z.string().transform((s): IbkrCodes[] => {
	if (s === "") return [];
	return s.split(";").map((code) => code as IbkrCodes);
});

// The schemas key fields by their raw XML attribute names. Where the XML name differs from
// the domain name, the field is aliased via z.preprocess on the raw input.
export function remap(raw: unknown, aliases: Record<string, string>): unknown {
	if (typeof raw !== "object" || raw === null) return raw;

	const result: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
	for (const [xmlKey, domainKey] of Object.entries(aliases)) {
		if (xmlKey in result) {
			result[domainKey] = result[xmlKey];
			delete result[xmlKey];
		}
	}
	return result;
}

export function toArray<T extends z.ZodTypeAny>(schema: T) {
	return z.preprocess(
		(v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]),
		z.array(schema),
	);
}
