import { assertEquals, assertNotEquals } from "@std/assert";
import { StagingFinancialIdentifier } from "@brrr/core/schemas/staging/StagingFinancialIdentifier.ts";

Deno.test("strict equality: same triple", () => {
	const a = new StagingFinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "Apple" });
	const b = new StagingFinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "Apple" });
	assertEquals(a.equals(b), true);
	assertEquals(a.toKey(), b.toKey());
});

Deno.test("strict equality: different ISIN same ticker and name - not equal", () => {
	const a = new StagingFinancialIdentifier({
		isin: "US7731221062",
		ticker: "RKLB",
		name: "ROCKET LAB CORP",
	});
	const b = new StagingFinancialIdentifier({
		isin: "US7731211089",
		ticker: "RKLB",
		name: "ROCKET LAB CORP",
	});
	assertEquals(a.equals(b), false);
	assertNotEquals(a.toKey(), b.toKey());
});

Deno.test("hash (toKey) equals when identifiers equal", () => {
	const a = new StagingFinancialIdentifier({ isin: "US123", ticker: "X", name: "Y" });
	const b = new StagingFinancialIdentifier({ isin: "US123", ticker: "X", name: "Y" });
	assertEquals(a.equals(b), true);
	assertEquals(a.toKey(), b.toKey());
});

Deno.test("none fields strict match - same ticker matches when no name conflict", () => {
	const a = new StagingFinancialIdentifier({ isin: null, ticker: "T", name: null });
	const b = new StagingFinancialIdentifier({ isin: null, ticker: "T", name: null });
	assertEquals(a.equals(b), true);

	// Do not match when Name differs.
	const a2 = new StagingFinancialIdentifier({ isin: null, ticker: "T", name: "N" });
	assertEquals(a.equals(a2), false);
});

Deno.test("ticker-only equality without ISIN", () => {
	const a = new StagingFinancialIdentifier({ isin: null, ticker: "AAPL", name: null });
	const b = new StagingFinancialIdentifier({ isin: null, ticker: "AAPL", name: null });
	assertEquals(a.equals(b), true);
});
