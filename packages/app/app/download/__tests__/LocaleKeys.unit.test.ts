import { describe, expect, test } from "vitest";
import {
	detailKindKeys,
	dropCategoryKeys,
	dropReasonKeys,
	lotMatchingKeys,
} from "~/download/sentences/sentenceKeys";
import en from "~~/i18n/locales/en.json";
import sl from "~~/i18n/locales/sl.json";

// The one test here that computes what it checks: every key map must point at keys both locales
// have, and the two locales must have the same keys.
const englishKeys = new Set(Object.keys(en));

describe("the locale files", () => {
	test("English and Slovenian have the same keys", () => {
		expect(Object.keys(en).sort()).toEqual(Object.keys(sl).sort());
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
});
