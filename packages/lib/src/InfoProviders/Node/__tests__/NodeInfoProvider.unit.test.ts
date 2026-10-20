import { NodeInfoProvider } from "@brrr/InfoProviders/Node/NodeInfoProvider";

test("the known countries pair each name the lookup understands with its ISO code", () => {
	const countries = new NodeInfoProvider().knownCountries();

	expect(countries.find((country) => country.code === "GB")?.name).toEqual("United Kingdom");
	expect(countries.find((country) => country.code === "SI")?.name).toEqual("Slovenia");
});

test("the known countries include the special mappings", () => {
	const countries = new NodeInfoProvider().knownCountries();

	expect(countries.find((country) => country.code === "ZA")?.name).toEqual("South Africa");
});

test("a country with several names is known once, by its first name", () => {
	const countries = new NodeInfoProvider().knownCountries();

	expect(countries.filter((country) => country.code === "CZ").length).toEqual(1);
	expect(countries.find((country) => country.code === "CZ")?.name).toEqual("Czech Republic");
	expect(countries.filter((country) => country.code === "KR").length).toEqual(1);
	expect(countries.find((country) => country.code === "KR")?.name).toEqual("South Korea");
});
