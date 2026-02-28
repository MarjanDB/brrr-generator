import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { GenericAssetClass, GenericCategory, GenericMonetaryExchangeInformation, GenericShortLong, GenericTradeReportItemGainType } from "@brrr/Core/Schemas/CommonFormats.ts";
import { IdentifierChangeType, IdentifierRelationship, IdentifierRelationshipSplit } from "@brrr/Core/Schemas/IdentifierRelationship.ts";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";
import { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";
import { TaxLot, type TaxLotStock } from "@brrr/Core/Schemas/Lots.ts";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";

function makeDate(iso: string) {
	return DateTime.fromISO(iso)!;
}

function makeMonetary(qty: number, price = 10.0) {
	return new GenericMonetaryExchangeInformation({
		underlyingCurrency: "USD",
		underlyingQuantity: qty,
		underlyingTradePrice: price,
		comissionCurrency: "USD",
		comissionTotal: 0,
		taxCurrency: "USD",
		taxTotal: 0,
		fxRateToBase: 1,
	});
}

function makeTrade(
	id: string,
	identifier: FinancialIdentifier,
	qty: number,
	dateStr: string,
	price = 10.0,
): TradeEventStockAcquired | TradeEventStockSold {
	if (qty > 0) {
		return new TradeEventStockAcquired({
			id,
			financialIdentifier: identifier,
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
		financialIdentifier: identifier,
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

Deno.test("two groupings with rename produce one merged grouping", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old Co" });
	const idB = new FinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New Co" });
	const events = new FinancialEvents({
		groupings: [
			makeGrouping(idA, [makeTrade("t1", idA, 1.0, "2024-01-01")]),
			makeGrouping(idB, [makeTrade("t2", idB, -1.0, "2024-02-01")]),
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
	assertEquals(result.groupings.length, 1);
	const merged = result.groupings[0];
	assertEquals(merged.financialIdentifier.isTheSameAs(idB), true);
	assertEquals(merged.stockTrades.length, 2);
	assertEquals(merged.stockTrades.every((t) => t.financialIdentifier.isTheSameAs(idB)), true);
	assertEquals(merged.provenance.length, 1);
	assertEquals(merged.provenance[0].fromIdentifier.isTheSameAs(idA), true);
	assertEquals(merged.provenance[0].toIdentifier.isTheSameAs(idB), true);
	assertEquals(merged.provenance[0].changeType, IdentifierChangeType.RENAME);
});

Deno.test("empty relationships leaves groupings unchanged", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "A", name: "A" });
	const events = new FinancialEvents({
		groupings: [makeGrouping(idA, [])],
		identifierRelationships: [],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.RENAME]);
	assertEquals(result.groupings.length, 1);
	assertEquals(result.groupings[0].financialIdentifier.isTheSameAs(idA), true);
});

Deno.test("no rename in change types leaves unchanged", () => {
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
	assertEquals(result.groupings.length, 1);
	assertEquals(result.groupings[0].financialIdentifier.isTheSameAs(idA), true);
});

Deno.test("chain A to B to C produces one grouping with C", () => {
	const idA = new FinancialIdentifier({ isin: "US111", ticker: "A", name: "A" });
	const idB = new FinancialIdentifier({ isin: "US222", ticker: "B", name: "B" });
	const idC = new FinancialIdentifier({ isin: "US333", ticker: "C", name: "C" });
	const events = new FinancialEvents({
		groupings: [
			makeGrouping(idA, [makeTrade("t1", idA, 1.0, "2024-01-01")]),
			makeGrouping(idB, [makeTrade("t2", idB, 1.0, "2024-02-01")]),
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
	assertEquals(result.groupings.length, 1);
	const merged = result.groupings[0];
	assertEquals(merged.financialIdentifier.isTheSameAs(idC), true);
	assertEquals(merged.stockTrades.length, 2);
	assertEquals(merged.provenance.length, 2);
	assertEquals(merged.provenance[0].fromIdentifier.isTheSameAs(idA), true);
	assertEquals(merged.provenance[0].toIdentifier.isTheSameAs(idB), true);
	assertEquals(merged.provenance[1].fromIdentifier.isTheSameAs(idB), true);
	assertEquals(merged.provenance[1].toIdentifier.isTheSameAs(idC), true);
});

Deno.test("sink grouping with different instance merges into one", () => {
	const idOld = new FinancialIdentifier({ isin: "US7731221062", ticker: "RKLB.old", name: "RKLB old" });
	const idNewInRel = new FinancialIdentifier({ isin: "US7731211089", ticker: "RKLB", name: "ROCKET LAB CORP" });
	const idNewInGrouping = new FinancialIdentifier({ isin: "US7731211089", ticker: "RKLB", name: "ROCKET LAB CORP" });
	const events = new FinancialEvents({
		groupings: [
			makeGrouping(idOld, [makeTrade("t1", idOld, 10.0, "2024-01-01")]),
			makeGrouping(idNewInGrouping, [makeTrade("t2", idNewInGrouping, -5.0, "2024-07-01")]),
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
	assertEquals(result.groupings.length, 1);
	const merged = result.groupings[0];
	assertEquals(merged.financialIdentifier.isTheSameAs(idNewInRel), true);
	assertEquals(merged.stockTrades.length, 2);
});

Deno.test("same ISIN different ticker matches rename chain", () => {
	const idOldInRel = new FinancialIdentifier({ isin: "US7731221062", ticker: "RKLB.OLD", name: null });
	const idNew = new FinancialIdentifier({ isin: "US7731211089", ticker: "RKLB", name: "ROCKET LAB CORP" });
	const idInGrouping = new FinancialIdentifier({ isin: "US7731221062", ticker: "RKLB", name: null });
	const events = new FinancialEvents({
		groupings: [makeGrouping(idInGrouping, [makeTrade("t1", idInGrouping, 5.0, "2024-01-01")])],
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
	assertEquals(result.groupings.length, 1);
	assertEquals(result.groupings[0].financialIdentifier.isTheSameAs(idNew), true);
	assertEquals(result.groupings[0].stockTrades.length, 1);
});

// === SPLIT TESTS ===

Deno.test("apply split scales trades before effective date and merges into to", () => {
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
		groupings: [makeGrouping(idFrom, [makeTrade("t1", idFrom, 4.0, "2024-09-01")])],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	assertEquals(result.groupings.length, 1);
	const merged = result.groupings[0];
	assertEquals(merged.financialIdentifier.isTheSameAs(idTo), true);
	assertEquals(merged.stockTrades.length, 1);
	const trade = merged.stockTrades[0];
	assertEquals(trade.exchangedMoney.underlyingQuantity, 40.0);
	assertEquals(trade.exchangedMoney.underlyingTradePrice, 1.0);
	assertEquals(trade.provenance.length, 1);
	const step = trade.provenance[0] as { quantityBefore: number; quantityAfter: number; beforeQuantity: number; beforeTradePrice: number };
	assertEquals(step.quantityBefore, 4.0);
	assertEquals(step.quantityAfter, 40.0);
	assertEquals(step.beforeQuantity, 4.0);
	assertEquals(step.beforeTradePrice, 10.0);
});

Deno.test("apply split scales underlying trade price", () => {
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
		groupings: [makeGrouping(idFrom, [makeTrade("t1", idFrom, 1.0, "2024-09-01", 100.0)])],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	assertEquals(result.groupings.length, 1);
	const trade = result.groupings[0].stockTrades[0];
	assertEquals(trade.exchangedMoney.underlyingQuantity, 10.0);
	assertEquals(trade.exchangedMoney.underlyingTradePrice, 10.0);
});

Deno.test("apply split does not scale trades on or after effective date", () => {
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
		groupings: [makeGrouping(idFrom, [makeTrade("t1", idFrom, 5.0, "2024-10-15")])],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	assertEquals(result.groupings.length, 1);
	assertEquals(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity, 5.0);
});

Deno.test("apply split scales lots before effective date", () => {
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
		financialIdentifier: idFrom,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2024-09-01"),
		multiplier: 1,
		exchangedMoney: makeMonetary(2.0, 10.0),
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
		provenance: [],
	});
	const sold = new TradeEventStockSold({
		id: "sold",
		financialIdentifier: idFrom,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2024-09-15"),
		multiplier: 1,
		exchangedMoney: makeMonetary(-2.0, 10.0),
		provenance: [],
	});
	const lot = new TaxLot({
		id: "lot1",
		financialIdentifier: idFrom,
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
	assertEquals(result.groupings.length, 1);
	assertEquals(result.groupings[0].stockTaxLots.length, 1);
	const scaledLot = result.groupings[0].stockTaxLots[0];
	assertEquals(scaledLot.quantity, 20.0);
	assertEquals(scaledLot.provenance.length, 1);
	const step = scaledLot.provenance[0] as { beforeQuantity: number };
	assertEquals(step.beforeQuantity, 2.0);
});

Deno.test("apply reverse split scales by ratio", () => {
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
		groupings: [makeGrouping(idFrom, [makeTrade("t1", idFrom, 10.0, "2024-09-01")])],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.REVERSE_SPLIT]);
	assertEquals(result.groupings.length, 1);
	assertEquals(result.groupings[0].financialIdentifier.isTheSameAs(idTo), true);
	assertEquals(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity, 1.0);
	assertEquals(result.groupings[0].stockTrades[0].exchangedMoney.underlyingTradePrice, 100.0);
});

Deno.test("apply split merges from into existing to grouping", () => {
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
			makeGrouping(idFrom, [makeTrade("t1", idFrom, 1.0, "2024-09-01")]),
			makeGrouping(idTo, [makeTrade("t2", idTo, 5.0, "2024-10-15")]),
		],
		identifierRelationships: [rel],
	});
	const service = new ApplyIdentifierRelationshipsService();
	const result = service.apply(events, [IdentifierChangeType.SPLIT]);
	assertEquals(result.groupings.length, 1);
	const merged = result.groupings[0];
	assertEquals(merged.financialIdentifier.isTheSameAs(idTo), true);
	assertEquals(merged.stockTrades.length, 2);
	const qtys = [...merged.stockTrades.map((t) => t.exchangedMoney.underlyingQuantity)].sort((a, b) => a - b);
	assertEquals(qtys[0], 5.0);
	assertEquals(qtys[1], 10.0);
});
