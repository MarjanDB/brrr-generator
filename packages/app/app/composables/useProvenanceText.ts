import {
	type ProvenanceDetail,
	ProvenanceDetailValue,
	type ProvenanceDrop,
	ProvenanceField,
	type ProvenanceNode,
	type ProvenanceWarning,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { DateTime } from "luxon";
import type { SplitChip } from "~/types/instrumentPanel";
import { BASE_CURRENCY } from "~/utils/baseCurrency";
import {
	chipKindKeys,
	detailKindKeys,
	detailValueParams,
	dropReasonKeys,
	lotMatchingKeys,
} from "~/utils/i18nKeys";
import { splitRatioOf } from "~/utils/instrumentPanel";
import { cashAmountOf, fieldOf, formatNumber } from "~/utils/provenanceFields";

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

	// What a corporate action's chip says: the split's ratio, or the name it had before.
	function chipText(chip: SplitChip): string {
		const ratio = splitRatio(chip);
		return t(chipKindKeys[chip.kind], {
			before: ratio?.before ?? chip.before ?? "",
			after: ratio?.after ?? chip.after ?? "",
			isin: chip.fromIsin ?? "",
			ticker: chip.fromTicker ?? "",
		});
	}

	// A node's day (a broker lot's, the day it was acquired); "" without one.
	function nodeDate(node: ProvenanceNode): string {
		const day = fieldOf(node, ProvenanceField.DATE) ?? fieldOf(node, ProvenanceField.ACQUIRED_DATE);
		return day === null ? "" : date(day);
	}

	// How many, without a sale's sign; "" without a quantity.
	function nodeQuantity(node: ProvenanceNode): string {
		const quantity = fieldOf(node, ProvenanceField.QUANTITY);
		return quantity === null ? "" : formatNumber(quantity.replace(/^-/, ""), locale.value);
	}

	function withCurrency(node: ProvenanceNode, value: string | null): string {
		if (value === null) {
			return "";
		}
		const currency = fieldOf(node, ProvenanceField.CURRENCY) ?? "";
		return `${formatNumber(value, locale.value)} ${currency}`.trim();
	}

	// A trade's price with its currency; "" without a price.
	function nodePrice(node: ProvenanceNode): string {
		return withCurrency(node, fieldOf(node, ProvenanceField.PRICE));
	}

	// A payment's amount with its currency; "" without one.
	function nodeAmount(node: ProvenanceNode): string {
		return withCurrency(node, cashAmountOf(node));
	}

	// A price the form holds, in the base currency: two to four decimals.
	function formPrice(value: number): string {
		const number = new Intl.NumberFormat(locale.value, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 4,
		}).format(value);
		return `${number} ${BASE_CURRENCY}`;
	}

	// A change the form's figures add up to, in the base currency, with its sign.
	function formChange(value: number): string {
		const number = new Intl.NumberFormat(locale.value, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
			signDisplay: "exceptZero",
		}).format(value);
		return `${number} ${BASE_CURRENCY}`;
	}

	return {
		dropSentence,
		warningSentence,
		detailSentence,
		date,
		splitRatio,
		chipText,
		nodeDate,
		nodeQuantity,
		nodePrice,
		nodeAmount,
		formPrice,
		formChange,
	};
}
