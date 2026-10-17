import { makeDate, makeMoney } from "@brrr/__tests__/support/Builders";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import {
	GenericAssetClass,
	GenericCategory,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import {
	IdentifierChangeType,
	IdentifierRelationship,
	IdentifierRelationshipSplit,
} from "@brrr/Core/Schemas/IdentifierRelationship";
import { TaxLot, type TaxLotStock } from "@brrr/Core/Schemas/Lots";

function makeMonetary(qty: number, price = 10.0) {
	return makeMoney({
		underlyingCurrency: "USD",
		underlyingQuantity: qty,
		underlyingTradePrice: price,
		commissionCurrency: "USD",
		taxCurrency: "USD",
	});
}

function makeTrade(
	id: string,
	qty: number,
	dateStr: string,
	price = 10.0,
): TradeEventStockAcquired | TradeEventStockSold {
	if (qty > 0) {
		return new TradeEventStockAcquired({
			id,
			assetClass: GenericAssetClass.STOCK,
			date: makeDate(dateStr),
			multiplier: 1,
			exchangedMoney: makeMonetary(qty, price),
			acquiredReason: GenericTradeReportItemGainType.BOUGHT,
			provenance: [],
		});
	}
	return new TradeEventStockSold({
		id,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate(dateStr),
		multiplier: 1,
		exchangedMoney: makeMonetary(qty, price),
		provenance: [],
	});
}

function makeGrouping(
	identifier: FinancialIdentifier,
	stockTrades: (TradeEventStockAcquired | TradeEventStockSold)[],
	stockTaxLots: TaxLotStock[] = [],
): FinancialGrouping {
	return new FinancialGrouping({
		financialIdentifier: identifier,
		countryOfOrigin: "US",
		underlyingCategory: GenericCategory.REGULAR,
		stockTrades,
		stockTaxLots,
		derivativeGroupings: [],
		cashTransactions: [],
		provenance: [],
	});
}

// === RENAME TESTS ===

test("two groupings with rename produce one merged grouping", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old Co" });
	const idB = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New Co" });
	const events = new FinancialEvents({
		groupings: [
			makeGrouping(idA, [makeTrade("t1", 1.0, "2024-01-01")]),
			makeGrouping(idB, [makeTrade("t2", -1.0, "2024-02-01")]),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idA,
				toIdentifier: idB,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: makeDate("2024-06-01"),
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
	const bought = makeTrade("t1", 1.0, "2024-01-01");
	const sold = makeTrade("t2", -1.0, "2024-02-01");
	const events = new FinancialEvents({
		groupings: [makeGrouping(idA, [bought]), makeGrouping(idB, [sold])],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idA,
				toIdentifier: idB,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: makeDate("2024-06-01"),
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
		groupings: [makeGrouping(idA, [])],
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
		groupings: [makeGrouping(idA, [])],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idA,
				toIdentifier: idB,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: makeDate("2024-01-01"),
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
			makeGrouping(idA, [makeTrade("t1", 1.0, "2024-01-01")]),
			makeGrouping(idB, [makeTrade("t2", 1.0, "2024-02-01")]),
			makeGrouping(idC, []),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idA,
				toIdentifier: idB,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: makeDate("2024-01-01"),
			}),
			new IdentifierRelationship({
				fromIdentifier: idB,
				toIdentifier: idC,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: makeDate("2024-02-01"),
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
			makeGrouping(idOld, [makeTrade("t1", 10.0, "2024-01-01")]),
			makeGrouping(idNewInGrouping, [makeTrade("t2", -5.0, "2024-07-01")]),
		],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idOld,
				toIdentifier: idNewInRel,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: makeDate("2024-06-01"),
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
		groupings: [makeGrouping(idInGrouping, [makeTrade("t1", 5.0, "2024-01-01")])],
		identifierRelationships: [
			new IdentifierRelationship({
				fromIdentifier: idOldInRel,
				toIdentifier: idNew,
				changeType: IdentifierChangeType.RENAME,
				effectiveDate: makeDate("2024-06-01"),
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
		effectiveDate: makeDate("2024-10-01"),
		quantityBefore: 4.0,
		quantityAfter: 40.0,
	});
	const events = new FinancialEvents({
		groupings: [makeGrouping(idFrom, [makeTrade("t1", 4.0, "2024-09-01")])],
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
	const step = trade.provenance[0] as {
		quantityBefore: number;
		quantityAfter: number;
		beforeQuantity: number;
		beforeTradePrice: number;
	};
	expect(step.quantityBefore).toEqual(4.0);
	expect(step.quantityAfter).toEqual(40.0);
	expect(step.beforeQuantity).toEqual(4.0);
	expect(step.beforeTradePrice).toEqual(10.0);
});

test("apply split builds new trades and leaves the originals untouched", () => {
	const idFrom = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
	const bought = makeTrade("t1", 4.0, "2024-09-01");
	const sold = makeTrade("t2", -2.0, "2024-09-02");
	const events = new FinancialEvents({
		groupings: [makeGrouping(idFrom, [bought, sold])],
		identifierRelationships: [
			new IdentifierRelationshipSplit({
				fromIdentifier: idFrom,
				toIdentifier: idTo,
				changeType: IdentifierChangeType.SPLIT,
				effectiveDate: makeDate("2024-10-01"),
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
		effectiveDate: makeDate("2024-10-01"),
		quantityBefore: 1.0,
		quantityAfter: 10.0,
	});
	const events = new FinancialEvents({
		groupings: [makeGrouping(idFrom, [makeTrade("t1", 1.0, "2024-09-01", 100.0)])],
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
		effectiveDate: makeDate("2024-10-01"),
		quantityBefore: 1.0,
		quantityAfter: 10.0,
	});
	const events = new FinancialEvents({
		groupings: [makeGrouping(idFrom, [makeTrade("t1", 5.0, "2024-10-15")])],
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
		effectiveDate: makeDate("2024-10-01"),
		quantityBefore: 2.0,
		quantityAfter: 20.0,
	});
	const acquired = new TradeEventStockAcquired({
		id: "acq",
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2024-09-01"),
		multiplier: 1,
		exchangedMoney: makeMonetary(2.0, 10.0),
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
		provenance: [],
	});
	const sold = new TradeEventStockSold({
		id: "sold",
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2024-09-15"),
		multiplier: 1,
		exchangedMoney: makeMonetary(-2.0, 10.0),
		provenance: [],
	});
	const lot = new TaxLot({
		id: "lot1",
		quantity: 2.0,
		acquired,
		sold,
		shortLongType: GenericShortLong.LONG,
		provenance: [],
	});
	const events = new FinancialEvents({
		groupings: [makeGrouping(idFrom, [], [lot])],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].stockTaxLots.length).toEqual(1);
	const scaledLot = result.groupings[0].stockTaxLots[0];
	expect(scaledLot.quantity).toEqual(20.0);
	expect(scaledLot.provenance.length).toEqual(1);
	const step = scaledLot.provenance[0] as { beforeQuantity: number };
	expect(step.beforeQuantity).toEqual(2.0);
});

test("apply reverse split scales by ratio", () => {
	const idFrom = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const idTo = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
	const rel = new IdentifierRelationshipSplit({
		fromIdentifier: idFrom,
		toIdentifier: idTo,
		changeType: IdentifierChangeType.REVERSE_SPLIT,
		effectiveDate: makeDate("2024-10-01"),
		quantityBefore: 10.0,
		quantityAfter: 1.0,
	});
	const events = new FinancialEvents({
		groupings: [makeGrouping(idFrom, [makeTrade("t1", 10.0, "2024-09-01")])],
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
		effectiveDate: makeDate("2024-10-01"),
		quantityBefore: 1.0,
		quantityAfter: 10.0,
	});
	const events = new FinancialEvents({
		groupings: [
			makeGrouping(idFrom, [makeTrade("t1", 1.0, "2024-09-01")]),
			makeGrouping(idTo, [makeTrade("t2", 5.0, "2024-10-15")]),
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
