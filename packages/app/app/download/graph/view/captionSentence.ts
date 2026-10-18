import type { CaptionText } from "~/download/graph/view/CaptionText";
import { dropSentence } from "~/download/sentences/dropSentence";
import type { SentenceFormat, Translate } from "~/download/sentences/Translate";

// One part of the caption as the reader sees it: a left-out node says why it was left out, anything
// else its text with the params that are keys translated first.
export function captionSentence(
	text: CaptionText,
	translate: Translate,
	format: SentenceFormat,
): string {
	if (text.drop !== null) {
		return dropSentence(text.drop, translate, format);
	}
	const params: Record<string, string> = {};
	for (const [name, value] of Object.entries(text.params)) {
		params[name] = text.keyParams.includes(name) ? translate(value, {}) : value;
	}
	return translate(text.key, params);
}
