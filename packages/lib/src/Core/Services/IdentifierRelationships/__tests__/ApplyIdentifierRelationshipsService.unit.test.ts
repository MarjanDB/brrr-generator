import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TradeEventStockAcquired } from "@brrr/Core/Models/Events/Stock/TradeEventStockAcquired";
import { TradeEventStockSold } from "@brrr/Core/Models/Events/Stock/TradeEventStockSold";
import { FinancialEvents } from "@brrr/Core/Models/FinancialEvents";
import { IdentifierChangeType } from "@brrr/Core/Models/IdentifierRelationships/IdentifierChangeType";
import { IdentifierRelationship } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationship";
import { IdentifierRelationshipSplit } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationshipSplit";
import {
	CountryCode,
	CurrencyCode,
	Isin,
	TaxLotId,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Models/Identifiers";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/Services/IdentifierRelationships/ApplyIdentifierRelationshipsService";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";

const { build } = Scenario;

// === RENAME TESTS ===

test("two groupings with rename produce one merged grouping", () => {
	const idA = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old Co",
	});
	const idB = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New Co",
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idA,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-01-01",
						quantity: 1.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
			build.grouping({
				identifier: idB,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockSold({
						id: TradeEventId.Schema.parse("t2"),
						date: "2024-02-01",
						quantity: -1.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idA,
				toIdentifier: idB,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: build.date("2024-06-01"),
			}),
		],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.RENAME], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idB)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(2);
});

test("a rename merge keeps the original trades", () => {
	const idA = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old Co",
	});
	const idB = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New Co",
	});
	const bought = build.stockBought({
		id: TradeEventId.Schema.parse("t1"),
		date: "2024-01-01",
		quantity: 1.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const sold = build.stockSold({
		id: TradeEventId.Schema.parse("t2"),
		date: "2024-02-01",
		quantity: -1.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idA,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [bought],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
			build.grouping({
				identifier: idB,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [sold],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idA,
				toIdentifier: idB,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: build.date("2024-06-01"),
			}),
		],
	});

	const [merged] = new ApplyIdentifierRelationshipsService().apply(
		events,
		[IdentifierChangeType.RENAME],
		new NullProvenanceRecorder(),
	).groupings;

	expect(merged.stockTrades[0]).toBe(bought);
	expect(merged.stockTrades[1]).toBe(sold);
});

test("empty relationships leaves groupings unchanged", () => {
	const idA = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("A"),
		name: "A",
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idA,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.RENAME], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isTheSameAs(idA)).toEqual(true);
});

test("no rename in change types leaves unchanged", () => {
	const idA = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("A"),
		name: "A",
	});
	const idB = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("B"),
		name: "B",
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idA,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idA,
				toIdentifier: idB,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: build.date("2024-01-01"),
			}),
		],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [], new NullProvenanceRecorder()); // no RENAME
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isTheSameAs(idA)).toEqual(true);
});

test("chain A to B to C produces one grouping with C", () => {
	const idA = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("A"),
		name: "A",
	});
	const idB = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("B"),
		name: "B",
	});
	const idC = new FinancialIdentifier({
		isin: Isin.Schema.parse("US333"),
		ticker: Ticker.Schema.parse("C"),
		name: "C",
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idA,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-01-01",
						quantity: 1.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
			build.grouping({
				identifier: idB,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t2"),
						date: "2024-02-01",
						quantity: 1.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
			build.grouping({
				identifier: idC,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idA,
				toIdentifier: idB,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: build.date("2024-01-01"),
			}),
			new IdentifierRelationship({
				fromIdentifier: idB,
				toIdentifier: idC,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: build.date("2024-02-01"),
			}),
		],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.RENAME], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idC)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(2);
});

test("sink grouping with different instance merges into one", () => {
	const idOld = new FinancialIdentifier({
		isin: Isin.Schema.parse("US7731221062"),
		ticker: Ticker.Schema.parse("RKLB.old"),
		name: "RKLB old",
	});
	const idNewInRel = new FinancialIdentifier({
		isin: Isin.Schema.parse("US7731211089"),
		ticker: Ticker.Schema.parse("RKLB"),
		name: "ROCKET LAB CORP",
	});
	const idNewInGrouping = new FinancialIdentifier({
		isin: Isin.Schema.parse("US7731211089"),
		ticker: Ticker.Schema.parse("RKLB"),
		name: "ROCKET LAB CORP",
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idOld,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-01-01",
						quantity: 10.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
			build.grouping({
				identifier: idNewInGrouping,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockSold({
						id: TradeEventId.Schema.parse("t2"),
						date: "2024-07-01",
						quantity: -5.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idOld,
				toIdentifier: idNewInRel,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: build.date("2024-06-01"),
			}),
		],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.RENAME], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idNewInRel)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(2);
});

test("same ISIN different ticker matches rename chain", () => {
	const idOldInRel = new FinancialIdentifier({
		isin: Isin.Schema.parse("US7731221062"),
		ticker: Ticker.Schema.parse("RKLB.OLD"),
		name: null,
	});
	const idNew = new FinancialIdentifier({
		isin: Isin.Schema.parse("US7731211089"),
		ticker: Ticker.Schema.parse("RKLB"),
		name: "ROCKET LAB CORP",
	});
	const idInGrouping = new FinancialIdentifier({
		isin: Isin.Schema.parse("US7731221062"),
		ticker: Ticker.Schema.parse("RKLB"),
		name: null,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idInGrouping,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-01-01",
						quantity: 5.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idOldInRel,
				toIdentifier: idNew,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: build.date("2024-06-01"),
			}),
		],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.RENAME], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isTheSameAs(idNew)).toEqual(true);
	expect(result.groupings[0].stockTrades.length).toEqual(1);
});

// === SPLIT TESTS ===

test("apply split scales trades before effective date and merges into to", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US86800U1043"),
		ticker: Ticker.Schema.parse("SMCI.OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US86800U3023"),
		ticker: Ticker.Schema.parse("SMCI"),
		name: "New",
	});
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 4.0,
		quantityAfter: 40.0,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idFrom,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-09-01",
						quantity: 4.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idTo)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(1);
	const trade = merged.stockTrades[0];
	expect(trade.exchangedMoney.quantity).toEqual(40.0);
	expect(trade.exchangedMoney.priceInBase).toEqual(1.0);
});

test("apply split builds new trades and leaves the originals untouched", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const bought = build.stockBought({
		id: TradeEventId.Schema.parse("t1"),
		date: "2024-09-01",
		quantity: 4.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const sold = build.stockSold({
		id: TradeEventId.Schema.parse("t2"),
		date: "2024-09-02",
		quantity: -2.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idFrom,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [bought, sold],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [
			new IdentifierRelationshipSplit({
				fromIdentifier: idFrom,
				toIdentifier: idTo,
				changeType: IdentifierChangeType.SPLIT,
				effectiveDate: build.date("2024-10-01"),
				quantityBefore: 1.0,
				quantityAfter: 10.0,
			}),
		],
	});

	const [merged] = new ApplyIdentifierRelationshipsService().apply(
		events,
		[IdentifierChangeType.SPLIT],
		new NullProvenanceRecorder(),
	).groupings;

	expect(merged.stockTrades[0]).toBeInstanceOf(TradeEventStockAcquired);
	expect(merged.stockTrades[1]).toBeInstanceOf(TradeEventStockSold);
	expect(merged.stockTrades.map((t) => t.exchangedMoney.quantity)).toEqual([40, -20]);
	expect(bought.exchangedMoney.quantity).toEqual(4.0);
	expect(sold.exchangedMoney.quantity).toEqual(-2.0);
});

test("apply split scales underlying trade price", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 1.0,
		quantityAfter: 10.0,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idFrom,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-09-01",
						quantity: 1.0,
						price: 100.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	const trade = result.groupings[0].stockTrades[0];
	expect(trade.exchangedMoney.quantity).toEqual(10.0);
	expect(trade.exchangedMoney.priceInBase).toEqual(10.0);
});

test("apply split does not scale trades on or after effective date", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 1.0,
		quantityAfter: 10.0,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idFrom,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-10-15",
						quantity: 5.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.quantity).toEqual(5.0);
});

test("apply split scales lots before effective date", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 2.0,
		quantityAfter: 20.0,
	});
	const acquired = build.stockBought({
		id: TradeEventId.Schema.parse("acq"),
		date: "2024-09-01",
		quantity: 2.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const sold = build.stockSold({
		id: TradeEventId.Schema.parse("sold"),
		date: "2024-09-15",
		quantity: -2.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const lot = build.stockTaxLot({
		id: TaxLotId.Schema.parse("lot1"),
		quantity: 2.0,
		shortLongType: ShortLong.LONG,
		acquired,
		sold,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idFrom,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [],
				stockTaxLots: [lot],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].stockTaxLots.length).toEqual(1);
	const scaledLot = result.groupings[0].stockTaxLots[0];
	expect(scaledLot.quantity).toEqual(20.0);
});

test("apply reverse split scales by ratio", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.REVERSE_SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 10.0,
		quantityAfter: 1.0,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idFrom,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-09-01",
						quantity: 10.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(
		events,
		[IdentifierChangeType.REVERSE_SPLIT],
		new NullProvenanceRecorder(),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isTheSameAs(idTo)).toEqual(true);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.quantity).toEqual(1.0);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.priceInBase).toEqual(100.0);
});

test("apply split merges from into existing to grouping", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 1.0,
		quantityAfter: 10.0,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idFrom,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t1"),
						date: "2024-09-01",
						quantity: 1.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
			build.grouping({
				identifier: idTo,
				countryOfOrigin: CountryCode.Schema.parse("US"),
				category: Category.REGULAR,
				stockTrades: [
					build.stockBought({
						id: TradeEventId.Schema.parse("t2"),
						date: "2024-10-15",
						quantity: 5.0,
						price: 10.0,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 1,
					}),
				],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT], new NullProvenanceRecorder());
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idTo)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(2);
	const qtys = [...merged.stockTrades.map((t) => t.exchangedMoney.quantity)].sort((a, b) => a - b);
	expect(qtys[0]).toEqual(5.0);
	expect(qtys[1]).toEqual(10.0);
});

// === PROVENANCE ===

test("a split records each rebuilt trade and grouping, from the old one and the corporate action", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US86800U1043"),
		ticker: Ticker.Schema.parse("SMCI.OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US86800U3023"),
		ticker: Ticker.Schema.parse("SMCI"),
		name: "New",
	});
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 4.0,
		quantityAfter: 40.0,
	});
	const trade = build.stockBought({
		id: TradeEventId.Schema.parse("t1"),
		date: "2024-09-01",
		quantity: 4.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const grouping = build.grouping({
		identifier: idFrom,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [trade],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const events = new FinancialEvents({
		groupings: [grouping],
		identifierRelationships: [rel],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(trade, ProvenanceNodeKind.EVENT, "stock bought t1 · 4 SMCI.OLD", {});
	graph.node(rel, ProvenanceNodeKind.CORPORATE_ACTION, "SPLIT SMCI.OLD → SMCI (4 → 40)", {});
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping US86800U1043 · SMCI.OLD", {});

	const result = new ApplyIdentifierRelationshipsService().apply(
		events,
		[IdentifierChangeType.SPLIT],
		graph,
	);

	const walker = new ProvenanceWalker(graph);
	const scaled = graph.nodeOf(result.groupings[0].stockTrades[0]);
	expect(scaled.kind).toEqual(ProvenanceNodeKind.EVENT);
	expect(scaled.label).toEqual("stock bought t1 · 40 SMCI.OLD");
	const parents = walker.parents(scaled);
	expect(parents).toHaveLength(2);
	expect(parents[0].from).toBe(graph.nodeOf(trade));
	expect(parents[0].change).toEqual(ProvenanceChange.SPLIT);
	expect(parents[0].by).toEqual("ApplyIdentifierRelationshipsService");
	expect(parents[0].detail).toEqual("4 → 40");
	expect(parents[1].from).toBe(graph.nodeOf(rel));
	const merged = graph.nodeOf(result.groupings[0]);
	expect(merged.kind).toEqual(ProvenanceNodeKind.GROUPING);
	expect(merged.label).toEqual("grouping US86800U3023 · SMCI");
});

test("a rename records the merged grouping, from both groupings and the corporate action", () => {
	const idA = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old Co",
	});
	const idB = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New Co",
	});
	const groupingA = build.grouping({
		identifier: idA,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const groupingB = build.grouping({
		identifier: idB,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const rel = new IdentifierRelationship({
		fromIdentifier: idA,
		toIdentifier: idB,
		changeType: IdentifierChangeType.RENAME,
		effectiveDate: build.date("2024-06-01"),
	});
	const events = new FinancialEvents({
		groupings: [groupingA, groupingB],
		identifierRelationships: [rel],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(groupingA, ProvenanceNodeKind.GROUPING, "grouping US111 · OLD", {});
	graph.node(groupingB, ProvenanceNodeKind.GROUPING, "grouping US222 · NEW", {});
	graph.node(rel, ProvenanceNodeKind.CORPORATE_ACTION, "RENAME OLD → NEW", {});

	const result = new ApplyIdentifierRelationshipsService().apply(
		events,
		[IdentifierChangeType.RENAME],
		graph,
	);

	const merged = graph.nodeOf(result.groupings[0]);
	expect(merged.label).toEqual("grouping US222 · NEW");
	const parents = new ProvenanceWalker(graph).parents(merged);
	expect(parents).toHaveLength(3);
	expect(parents[0].change).toEqual(ProvenanceChange.RENAMED);
	expect(parents[0].from).toBe(graph.nodeOf(groupingA));
	expect(parents[1].from).toBe(graph.nodeOf(groupingB));
	expect(parents[2].from).toBe(graph.nodeOf(rel));
});

test("a rename chain records the merged grouping, from every grouping and both corporate actions", () => {
	const idA = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("A"),
		name: "A",
	});
	const idB = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("B"),
		name: "B",
	});
	const idC = new FinancialIdentifier({
		isin: Isin.Schema.parse("US333"),
		ticker: Ticker.Schema.parse("C"),
		name: "C",
	});
	const groupingA = build.grouping({
		identifier: idA,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const groupingB = build.grouping({
		identifier: idB,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const groupingC = build.grouping({
		identifier: idC,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const relAB = new IdentifierRelationship({
		fromIdentifier: idA,
		toIdentifier: idB,
		changeType: IdentifierChangeType.RENAME,
		effectiveDate: build.date("2024-01-01"),
	});
	const relBC = new IdentifierRelationship({
		fromIdentifier: idB,
		toIdentifier: idC,
		changeType: IdentifierChangeType.RENAME,
		effectiveDate: build.date("2024-02-01"),
	});
	const events = new FinancialEvents({
		groupings: [groupingA, groupingB, groupingC],
		identifierRelationships: [relAB, relBC],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(groupingA, ProvenanceNodeKind.GROUPING, "grouping US111 · A", {});
	graph.node(groupingB, ProvenanceNodeKind.GROUPING, "grouping US222 · B", {});
	graph.node(groupingC, ProvenanceNodeKind.GROUPING, "grouping US333 · C", {});
	graph.node(relAB, ProvenanceNodeKind.CORPORATE_ACTION, "RENAME A → B", {});
	graph.node(relBC, ProvenanceNodeKind.CORPORATE_ACTION, "RENAME B → C", {});

	const result = new ApplyIdentifierRelationshipsService().apply(
		events,
		[IdentifierChangeType.RENAME],
		graph,
	);

	const merged = graph.nodeOf(result.groupings[0]);
	expect(merged.label).toEqual("grouping US333 · C");
	const parents = new ProvenanceWalker(graph).parents(merged);
	expect(parents).toHaveLength(5);
	expect(parents[0].from).toBe(graph.nodeOf(groupingA));
	expect(parents[1].from).toBe(graph.nodeOf(groupingB));
	expect(parents[2].from).toBe(graph.nodeOf(groupingC));
	expect(parents[3].from).toBe(graph.nodeOf(relAB));
	expect(parents[4].from).toBe(graph.nodeOf(relBC));
	expect(parents[4].change).toEqual(ProvenanceChange.RENAMED);
	expect(parents[4].detail).toEqual(null);
});

test("a split records each rebuilt lot, from the old one and the corporate action", () => {
	const idFrom = new FinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const idTo = new FinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 2.0,
		quantityAfter: 20.0,
	});
	const acquired = build.stockBought({
		id: TradeEventId.Schema.parse("acq"),
		date: "2024-09-01",
		quantity: 2.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const sold = build.stockSold({
		id: TradeEventId.Schema.parse("sold"),
		date: "2024-09-15",
		quantity: -2.0,
		price: 10.0,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const lot = build.stockTaxLot({
		id: TaxLotId.Schema.parse("lot1"),
		quantity: 2.0,
		shortLongType: ShortLong.LONG,
		acquired,
		sold,
	});
	const grouping = build.grouping({
		identifier: idFrom,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [lot],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const events = new FinancialEvents({
		groupings: [grouping],
		identifierRelationships: [rel],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(lot, ProvenanceNodeKind.LOT, "lot lot1 · 2 OLD", {});
	graph.node(rel, ProvenanceNodeKind.CORPORATE_ACTION, "SPLIT OLD → NEW (2 → 20)", {});
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping US111 · OLD", {});

	const result = new ApplyIdentifierRelationshipsService().apply(
		events,
		[IdentifierChangeType.SPLIT],
		graph,
	);

	const scaled = graph.nodeOf(result.groupings[0].stockTaxLots[0]);
	expect(scaled.kind).toEqual(ProvenanceNodeKind.LOT);
	expect(scaled.label).toEqual("lot lot1 · 20 OLD");
	const parents = new ProvenanceWalker(graph).parents(scaled);
	expect(parents).toHaveLength(2);
	expect(parents[0].from).toBe(graph.nodeOf(lot));
	expect(parents[0].change).toEqual(ProvenanceChange.SPLIT);
	expect(parents[0].detail).toEqual("2 → 20");
	expect(parents[1].from).toBe(graph.nodeOf(rel));
});
