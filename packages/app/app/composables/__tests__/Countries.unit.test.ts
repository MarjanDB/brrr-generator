import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { useCountries } from "~/composables/useCountries";

registerEndpoint("/api/countries", () => [
	{ name: "Germany", code: "DE" },
	{ name: "Austria", code: "AT" },
	{ name: "Slovenia", code: "SI" },
]);

// The composable and the i18n locale it reads. The app is shared between tests, so each sets its
// language first.
async function mountCountries(language: "en" | "sl") {
	const mounted = await mountComposable(() => ({ countries: useCountries(), i18n: useI18n() }));
	await mounted.i18n.setLocale(language);
	return mounted.countries;
}

describe("the countries a payer can be defined in", () => {
	test("none are offered until they are loaded", async () => {
		const countries = await mountCountries("en");

		expect(countries.options.value).toHaveLength(0);
	});

	test("each is offered by its code, named in English, in English order", async () => {
		const countries = await mountCountries("en");

		await countries.load();

		expect(countries.loadError.value).toBeNull();
		expect(countries.options.value).toHaveLength(3);
		expect(countries.options.value[0]?.value).toEqual("AT");
		expect(countries.options.value[0]?.label).toEqual("Austria");
		expect(countries.options.value[1]?.value).toEqual("DE");
		expect(countries.options.value[1]?.label).toEqual("Germany");
		expect(countries.options.value[2]?.value).toEqual("SI");
		expect(countries.options.value[2]?.label).toEqual("Slovenia");
	});

	test("each is offered by its code, named in Slovenian, in Slovenian order", async () => {
		const countries = await mountCountries("sl");

		await countries.load();

		expect(countries.options.value[0]?.value).toEqual("AT");
		expect(countries.options.value[0]?.label).toEqual("Avstrija");
		expect(countries.options.value[1]?.value).toEqual("DE");
		expect(countries.options.value[1]?.label).toEqual("Nemčija");
		expect(countries.options.value[2]?.value).toEqual("SI");
		expect(countries.options.value[2]?.label).toEqual("Slovenija");
	});

	test("a loaded country is found by its code, with the name the lookups know it by", async () => {
		const countries = await mountCountries("en");

		await countries.load();

		expect(countries.known("AT")?.name).toEqual("Austria");
		expect(countries.known("FR")).toBeNull();
	});

	test("a country's code is named in the reader's language", async () => {
		const english = await mountCountries("en");
		expect(english.labelOf("GB")).toEqual("United Kingdom");

		const slovenian = await mountCountries("sl");
		expect(slovenian.labelOf("GB")).toEqual("Združeno kraljestvo");
	});
});
