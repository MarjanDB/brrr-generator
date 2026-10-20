import type { KnownCountry } from "@brrr/lib/info/node";

// A country's name in the reader's language, from its ISO 3166-1 alpha-2 code; the code itself
// where the browser has no name for it.
export function countryLabelOf(code: string, locale: string): string {
	return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
}

// The countries a select offers, by code, named and ordered in the reader's language.
export function countryOptionsOf(
	countries: KnownCountry[],
	locale: string,
): { value: string; label: string }[] {
	const collator = new Intl.Collator(locale);
	return countries
		.map((country) => ({ value: country.code, label: countryLabelOf(country.code, locale) }))
		.sort((left, right) => collator.compare(left.label, right.label));
}
