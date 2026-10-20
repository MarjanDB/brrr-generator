import type { CountNoun } from "~/types/counts";
import { countKeys } from "~/utils/i18nKeys";
import { pluralFormOf } from "~/utils/pluralForm";

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
