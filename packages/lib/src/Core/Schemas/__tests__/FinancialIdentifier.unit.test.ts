import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { Isin, Ticker } from "@brrr/Core/Schemas/Identifiers";

test("FinancialIdentifier exposes readonly fields", () => {
	const identifier = new FinancialIdentifier({
		isin: Isin.Schema.parse("US0000000001"),
		ticker: Ticker.Schema.parse("ABC"),
	});

	expect(identifier.isin).toEqual("US0000000001");
	expect(identifier.ticker).toEqual("ABC");
	expect(identifier.name).toBeNull();
	expect(identifier.toKey()).toEqual("US0000000001|ABC|");
});
