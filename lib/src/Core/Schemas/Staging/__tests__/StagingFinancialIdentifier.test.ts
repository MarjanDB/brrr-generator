import { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";

test("strict equality: same triple", () => {
	const a = new StagingFinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "Apple" });
	const b = new StagingFinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "Apple" });
	expect(a.equals(b)).toEqual(true);
	expect(a.toKey()).toEqual(b.toKey());
});

test("strict equality: different ISIN same ticker and name - not equal", () => {
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
	expect(a.equals(b)).toEqual(false);
	expect(a.toKey()).not.toEqual(b.toKey());
});

test("hash (toKey) equals when identifiers equal", () => {
	const a = new StagingFinancialIdentifier({ isin: "US123", ticker: "X", name: "Y" });
	const b = new StagingFinancialIdentifier({ isin: "US123", ticker: "X", name: "Y" });
	expect(a.equals(b)).toEqual(true);
	expect(a.toKey()).toEqual(b.toKey());
});

test("none fields strict match - same ticker matches when no name conflict", () => {
	const a = new StagingFinancialIdentifier({ isin: null, ticker: "T", name: null });
	const b = new StagingFinancialIdentifier({ isin: null, ticker: "T", name: null });
	expect(a.equals(b)).toEqual(true);

	// Do not match when Name differs.
	const a2 = new StagingFinancialIdentifier({ isin: null, ticker: "T", name: "N" });
	expect(a.equals(a2)).toEqual(false);
});

test("ticker-only equality without ISIN", () => {
	const a = new StagingFinancialIdentifier({ isin: null, ticker: "AAPL", name: null });
	const b = new StagingFinancialIdentifier({ isin: null, ticker: "AAPL", name: null });
	expect(a.equals(b)).toEqual(true);
});
