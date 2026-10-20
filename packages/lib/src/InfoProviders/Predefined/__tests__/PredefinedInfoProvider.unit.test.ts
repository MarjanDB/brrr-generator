import { PredefinedInfoProvider } from "@brrr/InfoProviders/Predefined/PredefinedInfoProvider";

test("a company defined from plain strings is what the lookup gives for its ISIN", async () => {
	const info = new PredefinedInfoProvider();

	info.defineCompany({
		isin: "XS0000000009",
		name: "Nope Holdings plc",
		street: "1 Example Street",
		city: "London",
		countryName: "United Kingdom",
		countryCode: "GB",
	});

	const company = await info.getCompanyInfo("XS0000000009");
	expect(company?.shortName).toEqual("Nope Holdings plc");
	expect(company?.longName).toEqual("Nope Holdings plc");
	expect(company?.location.address1).toEqual("1 Example Street");
	expect(company?.location.address2).toEqual(null);
	expect(company?.location.zipCode).toEqual("");
	expect(company?.location.city).toEqual("London");
	expect(company?.location.state).toEqual(null);
	expect(company?.location.country).toEqual("United Kingdom");
	expect(company?.location.shortCodeCountry2).toEqual("GB");
});

test("defining a company again replaces the earlier definition", async () => {
	const info = new PredefinedInfoProvider();

	info.defineCompany({
		isin: "XS0000000009",
		name: "Nope Holdings plc",
		street: "1 Example Street",
		city: "London",
		countryName: "United Kingdom",
		countryCode: "GB",
	});
	info.defineCompany({
		isin: "XS0000000009",
		name: "Nope Holdings SE",
		street: "2 Rue Exemple",
		city: "Paris",
		countryName: "France",
		countryCode: "FR",
	});

	const company = await info.getCompanyInfo("XS0000000009");
	expect(company?.longName).toEqual("Nope Holdings SE");
	expect(company?.location.city).toEqual("Paris");
	expect(company?.location.shortCodeCountry2).toEqual("FR");
});
