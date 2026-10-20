import { describe, expect, test } from "vitest";
import { countryLabelOf, countryOptionsOf } from "~/utils/countries";

describe("the countries a payer can be defined in", () => {
	test("each is offered by its code, named in the reader's language, in that language's order", () => {
		const countries = [
			{ name: "Germany", code: "DE" },
			{ name: "Austria", code: "AT" },
			{ name: "Slovenia", code: "SI" },
		];

		const english = countryOptionsOf(countries, "en");
		const slovenian = countryOptionsOf(countries, "sl");

		expect(english).toHaveLength(3);
		expect(english[0]?.value).toEqual("AT");
		expect(english[0]?.label).toEqual("Austria");
		expect(english[1]?.value).toEqual("DE");
		expect(english[1]?.label).toEqual("Germany");
		expect(english[2]?.value).toEqual("SI");
		expect(english[2]?.label).toEqual("Slovenia");
		expect(slovenian[0]?.value).toEqual("AT");
		expect(slovenian[0]?.label).toEqual("Avstrija");
		expect(slovenian[1]?.value).toEqual("DE");
		expect(slovenian[1]?.label).toEqual("Nemčija");
		expect(slovenian[2]?.value).toEqual("SI");
		expect(slovenian[2]?.label).toEqual("Slovenija");
	});

	test("a country's code is named in the reader's language", () => {
		expect(countryLabelOf("GB", "en")).toEqual("United Kingdom");
		expect(countryLabelOf("GB", "sl")).toEqual("Združeno kraljestvo");
	});
});
