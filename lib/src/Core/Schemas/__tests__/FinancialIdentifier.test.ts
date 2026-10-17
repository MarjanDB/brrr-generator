import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";

test("FinancialIdentifier exposes readonly fields", () => {
	const identifier = new FinancialIdentifier({ isin: "US0000000001", ticker: "ABC" });

	expect(identifier.isin).toEqual("US0000000001");
	expect(identifier.ticker).toEqual("ABC");
	expect(identifier.name).toBeNull();
	expect(identifier.toKey()).toEqual("US0000000001|ABC|");
});
