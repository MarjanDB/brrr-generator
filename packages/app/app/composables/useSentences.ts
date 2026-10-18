import { DateTime } from "luxon";
import { lotMatchingKeys } from "~/download/sentences/sentenceKeys";
import type { SentenceFormat, Translate } from "~/download/sentences/Translate";

// The translator and the value formats the download step's sentences are written with, in the
// reader's locale.
export function useSentences() {
	const { t, locale } = useI18n();
	const translate: Translate = (key, params) => t(key, params);
	const format: SentenceFormat = {
		date: (iso) => DateTime.fromISO(iso).setLocale(locale.value).toLocaleString(DateTime.DATE_MED),
		method: (method) => t(lotMatchingKeys[method]),
	};
	return { translate, format };
}
