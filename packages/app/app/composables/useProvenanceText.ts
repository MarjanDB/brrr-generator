import {
	type ProvenanceDetail,
	ProvenanceDetailValue,
	type ProvenanceDrop,
	type ProvenanceWarning,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { DateTime } from "luxon";
import { splitRatioOf } from "~/download/labels/instrumentLabels";
import type { SplitChip } from "~/download/labels/SplitChip";
import {
	detailKindKeys,
	detailValueParams,
	dropReasonKeys,
	lotMatchingKeys,
} from "~/utils/i18nKeys";

// The sentences and values the download step writes about the provenance graph, finished and in
// the reader's locale.
export function useProvenanceText() {
	const { t, locale } = useI18n();

	function date(iso: string): string {
		return DateTime.fromISO(iso).setLocale(locale.value).toLocaleString(DateTime.DATE_MED);
	}

	function valueText(name: ProvenanceDetailValue, value: string): string {
		if (name === ProvenanceDetailValue.DATE) {
			return date(value);
		}
		if (name === ProvenanceDetailValue.LOT_MATCHING_METHOD) {
			const method = Object.values(TaxAuthorityLotMatchingMethod).find(
				(candidate) => candidate === value,
			);
			return method === undefined ? value : t(lotMatchingKeys[method]);
		}
		return value;
	}

	// The sentence of a detail: its kind's text, with one param per value the detail carries, in the
	// order they were recorded. Nothing is parsed out of a string.
	function detailSentence(detail: ProvenanceDetail): string {
		const params: Record<string, string> = {};
		for (const [recorded, value] of Object.entries(detail.values)) {
			const name = Object.values(ProvenanceDetailValue).find((candidate) => candidate === recorded);
			if (name !== undefined && value !== undefined) {
				params[detailValueParams[name]] = valueText(name, value);
			}
		}
		return t(detailKindKeys[detail.kind], params);
	}

	// What the report says about something it left out: its detail when it has one, else its reason.
	function dropSentence(drop: ProvenanceDrop): string {
		if (drop.detail === null) {
			return t(dropReasonKeys[drop.reason], {});
		}
		return detailSentence(drop.detail);
	}

	function warningSentence(warning: ProvenanceWarning): string {
		return detailSentence(warning.detail);
	}

	// A split's ratio in the usual form, its numbers written for the locale; null when the chip has
	// no ratio.
	function splitRatio(chip: SplitChip): { before: string; after: string } | null {
		return splitRatioOf(chip, locale.value);
	}

	return { dropSentence, warningSentence, detailSentence, date, splitRatio };
}
