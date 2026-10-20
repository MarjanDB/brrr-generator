import { type CountNoun, PluralForm } from "~/types/counts";
import { countKeys } from "~/utils/i18nKeys";

// The plural form a count takes in a locale. Intl's rules (CLDR's) look only at the last two digits,
// so Slovenian would say "401 postavka" and "102 delnici"; here only counts under a hundred take
// a form other than "other", so 1 to 4 keep theirs and 401 reads "401 postavk". A category the
// app has no words for falls back to "other".
function pluralFormOf(locale: string, count: number): PluralForm {
	if (count >= 100) {
		return PluralForm.OTHER;
	}
	const category = new Intl.PluralRules(locale).select(count);
	return Object.values(PluralForm).find((form) => form === category) ?? PluralForm.OTHER;
}

// A count with what it counts, in the reader's locale: "1 item needs a look", "3 pogodbe".
export function useCountText() {
	const { t, locale } = useI18n();

	function countText(noun: CountNoun, count: number): string {
		return t(countKeys[noun][pluralFormOf(locale.value, count)], {
			count: new Intl.NumberFormat(locale.value).format(count),
		});
	}

	return { countText };
}
