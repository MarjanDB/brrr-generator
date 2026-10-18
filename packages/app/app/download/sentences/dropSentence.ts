import type { ProvenanceDrop } from "@brrr/lib";
import { detailSentence } from "~/download/sentences/detailSentence";
import { dropReasonKeys } from "~/download/sentences/sentenceKeys";
import type { SentenceFormat, Translate } from "~/download/sentences/Translate";

// What the report says about something it left out: its detail when it has one, else its reason.
export function dropSentence(
	drop: ProvenanceDrop,
	translate: Translate,
	format: SentenceFormat,
): string {
	if (drop.detail === null) {
		return translate(dropReasonKeys[drop.reason], {});
	}
	return detailSentence(drop.detail, translate, format);
}
