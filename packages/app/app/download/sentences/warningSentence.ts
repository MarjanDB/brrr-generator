import type { ProvenanceWarning } from "@brrr/lib";
import { detailSentence } from "~/download/sentences/detailSentence";
import type { SentenceFormat, Translate } from "~/download/sentences/Translate";

export function warningSentence(
	warning: ProvenanceWarning,
	translate: Translate,
	format: SentenceFormat,
): string {
	return detailSentence(warning.detail, translate, format);
}
