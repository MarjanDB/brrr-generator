import { PluralForm } from "~/types/counts";

// The plural form a count takes in a locale. Intl's rules (CLDR's) look only at the last two digits,
// so Slovenian would say "401 postavka" and "102 delnici"; here only counts under a hundred take
// a form other than "other", so 1 to 4 keep theirs and 401 reads "401 postavk". A category the
// app has no words for falls back to "other".
export function pluralFormOf(locale: string, count: number): PluralForm {
	if (count >= 100) {
		return PluralForm.OTHER;
	}
	const category = new Intl.PluralRules(locale).select(count);
	return Object.values(PluralForm).find((form) => form === category) ?? PluralForm.OTHER;
}
