import { describe, expect, test } from "vitest";
import { PluralForm } from "~/types/counts";
import { pluralFormOf } from "~/utils/pluralForm";

describe("the plural form a count takes in a language", () => {
	test("English has a form for one thing and one for any other count", () => {
		expect(pluralFormOf("en", 1)).toEqual(PluralForm.ONE);
		expect(pluralFormOf("en", 0)).toEqual(PluralForm.OTHER);
		expect(pluralFormOf("en", 2)).toEqual(PluralForm.OTHER);
		expect(pluralFormOf("en", 5)).toEqual(PluralForm.OTHER);
	});

	test("Slovenian also has forms for two, and for three and four", () => {
		expect(pluralFormOf("sl", 1)).toEqual(PluralForm.ONE);
		expect(pluralFormOf("sl", 2)).toEqual(PluralForm.TWO);
		expect(pluralFormOf("sl", 3)).toEqual(PluralForm.FEW);
		expect(pluralFormOf("sl", 4)).toEqual(PluralForm.FEW);
		expect(pluralFormOf("sl", 5)).toEqual(PluralForm.OTHER);
		expect(pluralFormOf("sl", 0)).toEqual(PluralForm.OTHER);
	});

	test("in Slovenian, a hundred or more takes the many form, whatever its last digits", () => {
		expect(pluralFormOf("sl", 101)).toEqual(PluralForm.OTHER);
		expect(pluralFormOf("sl", 102)).toEqual(PluralForm.OTHER);
		expect(pluralFormOf("sl", 103)).toEqual(PluralForm.OTHER);
		expect(pluralFormOf("sl", 401)).toEqual(PluralForm.OTHER);
		expect(pluralFormOf("sl", 1001)).toEqual(PluralForm.OTHER);
		expect(pluralFormOf("sl", 21)).toEqual(PluralForm.OTHER);
	});

	test("in English, a hundred and one is many too", () => {
		expect(pluralFormOf("en", 101)).toEqual(PluralForm.OTHER);
	});
});
