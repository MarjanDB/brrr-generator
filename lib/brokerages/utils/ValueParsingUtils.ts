import { DateTime } from "luxon";

export function valueOrNull(value: string): string | null {
  return value === "" ? null : value;
}

export function floatValueOrNull(value: string): number | null {
  return value === "" ? null : parseFloat(value);
}

export function safeDateParse(dateString: string): DateTime {
  // Replace timezone abbreviations with offsets
  dateString = dateString.replace("EDT", "-04:00").replace("EST", "-05:00");

  // Try various formats
  const formats = [
    "yyyy-MM-dd HH:mm:ss ZZ",
    "yyyy-MM-dd;HH:mm:ss ZZ",
    "yyyy-MM-dd",
    "yyyyMMdd;HHmmss",
    "yyyyMMdd",
  ];

  for (const fmt of formats) {
    const parsed = DateTime.fromFormat(dateString, fmt);
    if (parsed.isValid) return parsed;
  }

  // Fallback: try ISO
  const iso = DateTime.fromISO(dateString);
  if (iso.isValid) return iso;

  throw new Error(`Could not parse date: ${dateString}`);
}

export function dateValueOrNull(value: string): DateTime | null {
  return value === "" ? null : safeDateParse(value);
}
