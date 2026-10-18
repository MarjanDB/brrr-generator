import {
	type ProvenanceDetail,
	ProvenanceDetailValue,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { detailKindKeys, detailValueParams } from "~/download/sentences/sentenceKeys";
import type { SentenceFormat, Translate } from "~/download/sentences/Translate";

function valueText(name: ProvenanceDetailValue, value: string, format: SentenceFormat): string {
	if (name === ProvenanceDetailValue.DATE) {
		return format.date(value);
	}
	if (name === ProvenanceDetailValue.LOT_MATCHING_METHOD) {
		const method = Object.values(TaxAuthorityLotMatchingMethod).find(
			(candidate) => candidate === value,
		);
		return method === undefined ? value : format.method(method);
	}
	return value;
}

// The sentence of a detail: its kind's text, with one param per value the detail carries, in the
// order they were recorded. Nothing is parsed out of a string.
export function detailSentence(
	detail: ProvenanceDetail,
	translate: Translate,
	format: SentenceFormat,
): string {
	const params: Record<string, string> = {};
	for (const [recorded, value] of Object.entries(detail.values)) {
		const name = Object.values(ProvenanceDetailValue).find((candidate) => candidate === recorded);
		if (name !== undefined && value !== undefined) {
			params[detailValueParams[name]] = valueText(name, value, format);
		}
	}
	return translate(detailKindKeys[detail.kind], params);
}
