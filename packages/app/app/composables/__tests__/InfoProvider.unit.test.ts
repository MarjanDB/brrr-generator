import { TreatyType } from "@brrr/lib";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { useInfoProvider } from "~/composables/useInfoProvider";

registerEndpoint("/api/country/Slovenia", () => ({
	name: "Slovenia",
	shortCode2: "SI",
	treaties: { TAX_RELIEF: "Article 10" },
}));

describe("the site's lookups", () => {
	test("a country from the server keeps its treaties, by treaty type", async () => {
		const info = await mountComposable(() => useInfoProvider());

		const country = await info.getCountry("Slovenia");

		expect(country?.name).toEqual("Slovenia");
		expect(country?.shortCode2).toEqual("SI");
		expect(country?.treaties.size).toEqual(1);
		expect(country?.treaties.get(TreatyType.TaxRelief)).toEqual("Article 10");
	});

	test("a payer defined by hand is the answer, without asking the server", async () => {
		const info = await mountComposable(() => useInfoProvider());

		info.defineCompany({
			isin: "XS0000000009",
			name: "Nope Holdings plc",
			street: "1 Example Street",
			city: "London",
			countryName: "United Kingdom",
			countryCode: "GB",
		});
		const after = await info.getCompanyInfo("XS0000000009");

		expect(after?.longName).toEqual("Nope Holdings plc");
		expect(after?.location.address1).toEqual("1 Example Street");
	});
});
