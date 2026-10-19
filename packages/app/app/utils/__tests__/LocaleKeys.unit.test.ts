import { ReportInstrumentKind } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import {
	detailKindKeys,
	dropCategoryKeys,
	dropReasonKeys,
	edavkiFieldKeys,
	eventKindKeys,
	headingKeys,
	laneLabelKeys,
	legSideKeys,
	lotMatchingKeys,
	markKeys,
	nodeValueKeys,
	stackKindKeys,
} from "~/utils/i18nKeys";
import { TAX_OFFICES } from "~/utils/taxOffices";
import en from "~~/i18n/locales/en.json";
import sl from "~~/i18n/locales/sl.json";

// The one test here that computes what it checks: every key map must point at keys both locales
// have, and the two locales must have the same keys.
const englishKeys = new Set(Object.keys(en));

describe("the locale files", () => {
	test("English and Slovenian have the same keys", () => {
		expect(Object.keys(en).sort()).toEqual(Object.keys(sl).sort());
	});

	// vue-i18n takes a bare @ to start a linked message and fails to compile the whole file in the
	// browser; a literal @ is written {'@'}.
	test("no message has a bare @", () => {
		const bare = /@(?!'\})/;
		expect(Object.entries(en).filter(([, text]) => bare.test(text))).toEqual([]);
		expect(Object.entries(sl).filter(([, text]) => bare.test(text))).toEqual([]);
	});

	test("every tax office's country and forms have keys in the locale files", () => {
		for (const office of TAX_OFFICES) {
			expect(englishKeys.has(office.countryKey)).toEqual(true);
			for (const key of office.formKeys) {
				expect(englishKeys.has(key)).toEqual(true);
			}
		}
	});

	test("every drop reason has a key in the locale files", () => {
		for (const key of Object.values(dropReasonKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every detail kind has a key in the locale files", () => {
		for (const key of Object.values(detailKindKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every event kind has a key in the locale files", () => {
		for (const key of Object.values(eventKindKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every kind of timeline mark has a key in the locale files", () => {
		for (const key of Object.values(markKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every drop category has a key in the locale files", () => {
		for (const key of Object.values(dropCategoryKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every lot-matching method has a key in the locale files", () => {
		for (const key of Object.values(lotMatchingKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every kind of node value has a key in the locale files", () => {
		for (const key of Object.values(nodeValueKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every side of a leg has a key in the locale files", () => {
		for (const key of Object.values(legSideKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every kind of node has a noun in the locale files", () => {
		for (const key of Object.values(stackKindKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every report line field has a key in the locale files", () => {
		for (const key of Object.values(edavkiFieldKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every column heading has a key in the locale files", () => {
		for (const key of Object.values(headingKeys)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("the lane labels for trades and for dividends have keys in the locale files", () => {
		const trades = laneLabelKeys(ReportInstrumentKind.STOCK);
		const dividends = laneLabelKeys(ReportInstrumentKind.DIVIDEND_PAYER);

		expect(englishKeys.has(trades.acquired)).toEqual(true);
		expect(englishKeys.has(trades.sold)).toEqual(true);
		expect(englishKeys.has(dividends.acquired)).toEqual(true);
		expect(englishKeys.has(dividends.sold)).toEqual(true);
	});
});
