import { Isin, Ticker } from "@brrr/Core/Models/Identifiers";
import { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";

test("strict equality: same triple", () => {
	const a = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US123"),
		ticker: Ticker.Schema.parse("AAPL"),
		name: "Apple",
	});
	const b = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US123"),
		ticker: Ticker.Schema.parse("AAPL"),
		name: "Apple",
	});
	expect(a.isTheSameAs(b)).toEqual(true);
	expect(a.toKey()).toEqual(b.toKey());
});

test("strict equality: different ISIN same ticker and name - not equal", () => {
	const a = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US7731221062"),
		ticker: Ticker.Schema.parse("RKLB"),
		name: "ROCKET LAB CORP",
	});
	const b = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US7731211089"),
		ticker: Ticker.Schema.parse("RKLB"),
		name: "ROCKET LAB CORP",
	});
	expect(a.isTheSameAs(b)).toEqual(false);
	expect(a.toKey()).not.toEqual(b.toKey());
});

test("hash (toKey) equals when identifiers equal", () => {
	const a = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US123"),
		ticker: Ticker.Schema.parse("X"),
		name: "Y",
	});
	const b = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US123"),
		ticker: Ticker.Schema.parse("X"),
		name: "Y",
	});
	expect(a.isTheSameAs(b)).toEqual(true);
	expect(a.toKey()).toEqual(b.toKey());
});

test("none fields strict match - same ticker matches when no name conflict", () => {
	const a = new StagingFinancialIdentifier({
		isin: null,
		ticker: Ticker.Schema.parse("T"),
		name: null,
	});
	const b = new StagingFinancialIdentifier({
		isin: null,
		ticker: Ticker.Schema.parse("T"),
		name: null,
	});
	expect(a.isTheSameAs(b)).toEqual(true);

	// Do not match when Name differs.
	const a2 = new StagingFinancialIdentifier({
		isin: null,
		ticker: Ticker.Schema.parse("T"),
		name: "N",
	});
	expect(a.isTheSameAs(a2)).toEqual(false);
});

test("ticker-only equality without ISIN", () => {
	const a = new StagingFinancialIdentifier({
		isin: null,
		ticker: Ticker.Schema.parse("AAPL"),
		name: null,
	});
	const b = new StagingFinancialIdentifier({
		isin: null,
		ticker: Ticker.Schema.parse("AAPL"),
		name: null,
	});
	expect(a.isTheSameAs(b)).toEqual(true);
});
