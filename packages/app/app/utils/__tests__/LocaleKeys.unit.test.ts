import { ReportInstrumentKind } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { I18nKeys } from "~/utils/i18nKeys";
import { TaxOffices } from "~/utils/taxOffices";
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

	test("every step of the report flow has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.reportStep)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every tax office's country and forms have keys in the locale files", () => {
		for (const office of TaxOffices.all) {
			expect(englishKeys.has(office.countryKey)).toEqual(true);
			for (const key of office.formKeys) {
				expect(englishKeys.has(key)).toEqual(true);
			}
		}
	});

	test("every drop reason has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.dropReason)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every detail kind has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.detailKind)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every event kind has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.eventKind)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every kind of timeline mark has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.mark)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every drop category has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.dropCategory)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every lot-matching method has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.lotMatching)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every kind of node value has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.nodeValue)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every side of a leg has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.legSide)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every kind of node has a noun in the locale files", () => {
		for (const key of Object.values(I18nKeys.stackKind)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every report line field has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.edavkiField)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every column heading has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.heading)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("the lane labels for trades and for dividends have keys in the locale files", () => {
		const trades = I18nKeys.laneLabels(ReportInstrumentKind.STOCK);
		const dividends = I18nKeys.laneLabels(ReportInstrumentKind.DIVIDEND_PAYER);

		expect(englishKeys.has(trades.acquired)).toEqual(true);
		expect(englishKeys.has(trades.sold)).toEqual(true);
		expect(englishKeys.has(dividends.acquired)).toEqual(true);
		expect(englishKeys.has(dividends.sold)).toEqual(true);
	});

	test("every corporate action chip has a key in the locale files", () => {
		for (const key of Object.values(I18nKeys.chipKind)) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every reason in everything detected has its verdict and details in the locale files", () => {
		for (const key of [
			...Object.values(I18nKeys.detectedVerdict),
			...Object.values(I18nKeys.detectedDetail),
			...Object.values(I18nKeys.detectedPart),
		]) {
			expect(englishKeys.has(key)).toEqual(true);
		}
	});

	test("every counted noun has every plural form in the locale files", () => {
		for (const forms of Object.values(I18nKeys.count)) {
			for (const key of Object.values(forms)) {
				expect(englishKeys.has(key)).toEqual(true);
			}
		}
	});
});
