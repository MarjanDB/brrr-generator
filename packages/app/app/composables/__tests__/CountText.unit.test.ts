import { describe, expect, test } from "vitest";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { useCountText } from "~/composables/useCountText";
import { CountNoun } from "~/types/counts";

// The composable and the i18n locale it reads. The app is shared between tests, so each sets its
// language first.
async function mountCountText(language: "en" | "sl") {
	const mounted = await mountComposable(() => ({ counts: useCountText(), i18n: useI18n() }));
	await mounted.i18n.setLocale(language);
	return mounted.counts;
}

describe("a count with what it counts, as a button or a summary says it", () => {
	test("in English, a problem's button says how many and what", async () => {
		const { countText } = await mountCountText("en");

		expect(countText(CountNoun.ITEM_NEEDS_A_LOOK, 1)).toEqual("1 item needs a look");
		expect(countText(CountNoun.ITEM_NEEDS_A_LOOK, 2)).toEqual("2 items need a look");
		expect(countText(CountNoun.WARNING, 1)).toEqual("1 warning");
		expect(countText(CountNoun.WARNING, 3)).toEqual("3 warnings");
		expect(countText(CountNoun.ITEM_LEFT_OUT, 1)).toEqual("1 item was left out of the import");
		expect(countText(CountNoun.ITEM_LEFT_OUT, 4)).toEqual("4 items were left out of the import");
	});

	test("in English, the report's summary and the list's counts", async () => {
		const { countText } = await mountCountText("en");

		expect(countText(CountNoun.FORM_LINE, 1)).toEqual("1 line on the form");
		expect(countText(CountNoun.FORM_LINE, 1234)).toEqual("1,234 lines on the form");
		expect(countText(CountNoun.ITEM_NOT_ON_FORM, 5)).toEqual("5 items not on it");
		expect(countText(CountNoun.CONTRACT, 1)).toEqual("1 contract");
		expect(countText(CountNoun.SHARE, 2)).toEqual("2 shares");
	});

	test("in Slovenian, each count takes its own form for one, two, three or four, and more", async () => {
		const { countText } = await mountCountText("sl");

		expect(countText(CountNoun.ITEM_NEEDS_A_LOOK, 1)).toEqual("1 postavka zahteva pregled");
		expect(countText(CountNoun.ITEM_NEEDS_A_LOOK, 2)).toEqual("2 postavki zahtevata pregled");
		expect(countText(CountNoun.ITEM_NEEDS_A_LOOK, 3)).toEqual("3 postavke zahtevajo pregled");
		expect(countText(CountNoun.ITEM_NEEDS_A_LOOK, 5)).toEqual("5 postavk zahteva pregled");
		expect(countText(CountNoun.WARNING, 2)).toEqual("2 opozorili");
		expect(countText(CountNoun.FORM_LINE, 12345)).toEqual("12.345 vrstic na obrazcu");
		expect(countText(CountNoun.ITEM_LEFT_OUT, 1)).toEqual("1 postavka je bila izpuščena iz uvoza");
		expect(countText(CountNoun.ITEM_LEFT_OUT, 401)).toEqual(
			"401 postavk je bilo izpuščenih iz uvoza",
		);
		expect(countText(CountNoun.SHARE, 102)).toEqual("102 delnic");
		expect(countText(CountNoun.CONTRACT, 3)).toEqual("3 pogodbe");
	});
});
