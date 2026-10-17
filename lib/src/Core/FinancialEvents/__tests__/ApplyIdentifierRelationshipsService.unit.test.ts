import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import {
	IdentifierChangeType,
	IdentifierRelationship,
	IdentifierRelationshipSplit,
} from "@brrr/Core/Schemas/IdentifierRelationship";
import { SplitProvenanceStep } from "@brrr/Core/Schemas/Provenance";

const { build } = Scenario;

// === RENAME TESTS ===

test("two groupings with rename produce one merged grouping", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old Co" });
	const idB = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New Co" });
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idA,
				stockTrades: [build.stockBought({ id: "t1", quantity: 1.0, date: "2024-01-01" })],
			}),
			build.grouping({
				identifier: idB,
				stockTrades: [build.stockSold({ id: "t2", quantity: -1.0, date: "2024-02-01" })],
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
	const result = service.apply(events, [IdentifierChangeType.RENAME]);
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idB)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(2);
	expect(merged.provenance.length).toEqual(1);
	expect(merged.provenance[0].fromIdentifier.isTheSameAs(idA)).toEqual(true);
	expect(merged.provenance[0].toIdentifier.isTheSameAs(idB)).toEqual(true);
	expect(merged.provenance[0].changeType).toEqual(IdentifierChangeType.RENAME);
});

test("a rename merge keeps the original trades", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old Co" });
	const idB = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New Co" });
	const bought = build.stockBought({ id: "t1", quantity: 1.0, date: "2024-01-01" });
	const sold = build.stockSold({ id: "t2", quantity: -1.0, date: "2024-02-01" });
	const events = new FinancialEvents({
		groupings: [
			build.grouping({ identifier: idA, stockTrades: [bought] }),
			build.grouping({ identifier: idB, stockTrades: [sold] }),
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

	const [merged] = new ApplyIdentifierRelationshipsService().apply(events, [
		IdentifierChangeType.RENAME,
	]).groupings;

	expect(merged.stockTrades[0]).toBe(bought);
	expect(merged.stockTrades[1]).toBe(sold);
});

test("empty relationships leaves groupings unchanged", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "A", name: "A" });
	const events = new FinancialEvents({
		groupings: [build.grouping({ identifier: idA })],
		identifierRelationships: [],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.RENAME]);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isTheSameAs(idA)).toEqual(true);
});

test("no rename in change types leaves unchanged", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "A", name: "A" });
	const idB = new FinancialIdentifier({ isin: "US222", ticker: "B", name: "B" });
	const events = new FinancialEvents({
		groupings: [build.grouping({ identifier: idA })],
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
	const result = service.apply(events, []); // no RENAME
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isTheSameAs(idA)).toEqual(true);
});

test("chain A to B to C produces one grouping with C", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "A", name: "A" });
	const idB = new FinancialIdentifier({ isin: "US222", ticker: "B", name: "B" });
	const idC = new FinancialIdentifier({ isin: "US333", ticker: "C", name: "C" });
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idA,
				stockTrades: [build.stockBought({ id: "t1", quantity: 1.0, date: "2024-01-01" })],
			}),
			build.grouping({
				identifier: idB,
				stockTrades: [build.stockBought({ id: "t2", quantity: 1.0, date: "2024-02-01" })],
			}),
			build.grouping({ identifier: idC }),
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
	const result = service.apply(events, [IdentifierChangeType.RENAME]);
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idC)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(2);
	expect(merged.provenance.length).toEqual(2);
	expect(merged.provenance[0].fromIdentifier.isTheSameAs(idA)).toEqual(true);
	expect(merged.provenance[0].toIdentifier.isTheSameAs(idB)).toEqual(true);
	expect(merged.provenance[1].fromIdentifier.isTheSameAs(idB)).toEqual(true);
	expect(merged.provenance[1].toIdentifier.isTheSameAs(idC)).toEqual(true);
});

test("sink grouping with different instance merges into one", () => {
	const idOld = new FinancialIdentifier({
		isin: "US7731221062",
		ticker: "RKLB.old",
		name: "RKLB old",
	});
	const idNewInRel = new FinancialIdentifier({
		isin: "US7731211089",
		ticker: "RKLB",
		name: "ROCKET LAB CORP",
	});
	const idNewInGrouping = new FinancialIdentifier({
		isin: "US7731211089",
		ticker: "RKLB",
		name: "ROCKET LAB CORP",
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idOld,
				stockTrades: [build.stockBought({ id: "t1", quantity: 10.0, date: "2024-01-01" })],
			}),
			build.grouping({
				identifier: idNewInGrouping,
				stockTrades: [build.stockSold({ id: "t2", quantity: -5.0, date: "2024-07-01" })],
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
	const result = service.apply(events, [IdentifierChangeType.RENAME]);
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idNewInRel)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(2);
});

test("same ISIN different ticker matches rename chain", () => {
	const idOldInRel = new FinancialIdentifier({
		isin: "US7731221062",
		ticker: "RKLB.OLD",
		name: null,
	});
	const idNew = new FinancialIdentifier({
		isin: "US7731211089",
		ticker: "RKLB",
		name: "ROCKET LAB CORP",
	});
	const idInGrouping = new FinancialIdentifier({
		isin: "US7731221062",
		ticker: "RKLB",
		name: null,
	});
	const events = new FinancialEvents({
		groupings: [
			build.grouping({
				identifier: idInGrouping,
				stockTrades: [build.stockBought({ id: "t1", quantity: 5.0, date: "2024-01-01" })],
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
	const result = service.apply(events, [IdentifierChangeType.RENAME]);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isTheSameAs(idNew)).toEqual(true);
	expect(result.groupings[0].stockTrades.length).toEqual(1);
});

// === SPLIT TESTS ===

test("apply split scales trades before effective date and merges into to", () => {
	const idFrom = new FinancialIdentifier({ isin: "US86800U1043", ticker: "SMCI.OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US86800U3023", ticker: "SMCI", name: "New" });
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
				stockTrades: [
					build.stockBought({ id: "t1", quantity: 4.0, date: "2024-09-01", price: 10.0 }),
				],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idTo)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(1);
	const trade = merged.stockTrades[0];
	expect(trade.exchangedMoney.underlyingQuantity).toEqual(40.0);
	expect(trade.exchangedMoney.underlyingTradePrice).toEqual(1.0);
	expect(trade.provenance.length).toEqual(1);
	expect(trade.provenance[0]).toBeInstanceOf(SplitProvenanceStep);
	expect(trade.provenance[0]).toMatchObject({
		quantityBefore: 4.0,
		quantityAfter: 40.0,
		beforeQuantity: 4.0,
		beforeTradePrice: 10.0,
	});
});

test("apply split builds new trades and leaves the originals untouched", () => {
	const idFrom = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
	const bought = build.stockBought({ id: "t1", quantity: 4.0, date: "2024-09-01" });
	const sold = build.stockSold({ id: "t2", quantity: -2.0, date: "2024-09-02" });
	const events = new FinancialEvents({
		groupings: [build.grouping({ identifier: idFrom, stockTrades: [bought, sold] })],
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

	const [merged] = new ApplyIdentifierRelationshipsService().apply(events, [
		IdentifierChangeType.SPLIT,
	]).groupings;

	expect(merged.stockTrades[0]).toBeInstanceOf(TradeEventStockAcquired);
	expect(merged.stockTrades[1]).toBeInstanceOf(TradeEventStockSold);
	expect(merged.stockTrades.map((t) => t.exchangedMoney.underlyingQuantity)).toEqual([40, -20]);
	expect(bought.exchangedMoney.underlyingQuantity).toEqual(4.0);
	expect(bought.provenance).toEqual([]);
	expect(sold.exchangedMoney.underlyingQuantity).toEqual(-2.0);
	expect(sold.provenance).toEqual([]);
});

test("apply split scales underlying trade price", () => {
	const idFrom = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
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
				stockTrades: [
					build.stockBought({ id: "t1", quantity: 1.0, date: "2024-09-01", price: 100.0 }),
				],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	expect(result.groupings.length).toEqual(1);
	const trade = result.groupings[0].stockTrades[0];
	expect(trade.exchangedMoney.underlyingQuantity).toEqual(10.0);
	expect(trade.exchangedMoney.underlyingTradePrice).toEqual(10.0);
});

test("apply split does not scale trades on or after effective date", () => {
	const idFrom = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
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
				stockTrades: [build.stockBought({ id: "t1", quantity: 5.0, date: "2024-10-15" })],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity).toEqual(5.0);
});

test("apply split scales lots before effective date", () => {
	const idFrom = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: build.date("2024-10-01"),
		quantityBefore: 2.0,
		quantityAfter: 20.0,
	});
	const lot = build.stockTaxLot({
		id: "lot1",
		acquired: build.stockBought({ id: "acq", date: "2024-09-01", quantity: 2.0, price: 10.0 }),
		sold: build.stockSold({ id: "sold", date: "2024-09-15", quantity: -2.0, price: 10.0 }),
	});
	const events = new FinancialEvents({
		groupings: [build.grouping({ identifier: idFrom, stockTaxLots: [lot] })],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].stockTaxLots.length).toEqual(1);
	const scaledLot = result.groupings[0].stockTaxLots[0];
	expect(scaledLot.quantity).toEqual(20.0);
	expect(scaledLot.provenance.length).toEqual(1);
	expect(scaledLot.provenance[0]).toBeInstanceOf(SplitProvenanceStep);
	expect(scaledLot.provenance[0]).toMatchObject({ beforeQuantity: 2.0 });
});

test("apply reverse split scales by ratio", () => {
	const idFrom = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
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
				stockTrades: [
					build.stockBought({ id: "t1", quantity: 10.0, date: "2024-09-01", price: 10.0 }),
				],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.REVERSE_SPLIT]);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isTheSameAs(idTo)).toEqual(true);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity).toEqual(1.0);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingTradePrice).toEqual(100.0);
});

test("apply split merges from into existing to grouping", () => {
	const idFrom = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
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
				stockTrades: [build.stockBought({ id: "t1", quantity: 1.0, date: "2024-09-01" })],
			}),
			build.grouping({
				identifier: idTo,
				stockTrades: [build.stockBought({ id: "t2", quantity: 5.0, date: "2024-10-15" })],
			}),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	expect(result.groupings.length).toEqual(1);
	const merged = result.groupings[0];
	expect(merged.financialIdentifier.isTheSameAs(idTo)).toEqual(true);
	expect(merged.stockTrades.length).toEqual(2);
	const qtys = [...merged.stockTrades.map((t) => t.exchangedMoney.underlyingQuantity)].sort(
		(a, b) => a - b,
	);
	expect(qtys[0]).toEqual(5.0);
	expect(qtys[1]).toEqual(10.0);
});
