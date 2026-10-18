import type { ProvenanceDrop } from "@brrr/lib";
import type { CaptionText } from "~/download/graph/view/CaptionText";

// One part of the caption as the reader sees it: a left-out node says why it was left out, anything
// else its text with the params that are keys translated first.
export function captionSentence(
	text: CaptionText,
	translate: (key: string, params: Record<string, string>) => string,
	dropSentence: (drop: ProvenanceDrop) => string,
): string {
	if (text.drop !== null) {
		return dropSentence(text.drop);
	}
	const params: Record<string, string> = {};
	for (const [name, value] of Object.entries(text.params)) {
		params[name] = text.keyParams.includes(name) ? translate(value, {}) : value;
	}
	return translate(text.key, params);
}
