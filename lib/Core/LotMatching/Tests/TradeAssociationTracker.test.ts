import { assertEquals, assertThrows } from "@std/assert";
import { DateTime } from "luxon";
import { TradeAssociationTracker } from "@brrr/Core/LotMatching/TradeAssociationTracker.ts";
import type { Trade } from "@brrr/Core/LotMatching/Trade.ts";

const simpleBuyTrade: Trade = { id: "ID", quantity: 1, date: DateTime.fromISO("2023-01-01")! };
const simpleSoldTrade: Trade = { id: "ID2", quantity: -1, date: DateTime.fromISO("2023-01-01")! };

Deno.test("retrieval of tracker for simple acquired trade", () => {
	const tracker = new TradeAssociationTracker();
	tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5);
	const retrieved = tracker.getAcquiredTradeTracker(simpleBuyTrade);
	assertEquals(retrieved.quantity, 0.5);
});

Deno.test("retrieval of tracker for simple sold trade", () => {
	const tracker = new TradeAssociationTracker();
	tracker.trackSoldQuantity(simpleSoldTrade, 0.5);
	const retrieved = tracker.getSoldTradeTracker(simpleSoldTrade);
	assertEquals(retrieved.quantity, 0.5);
});

Deno.test("summation of quantity for acquired trade", () => {
	const tracker = new TradeAssociationTracker();
	tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5);
	tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5);
	const retrieved = tracker.getAcquiredTradeTracker(simpleBuyTrade);
	assertEquals(retrieved.quantity, 1);
});

Deno.test("summation of quantity for sold trade", () => {
	const tracker = new TradeAssociationTracker();
	tracker.trackSoldQuantity(simpleSoldTrade, 0.5);
	tracker.trackSoldQuantity(simpleSoldTrade, 0.5);
	const retrieved = tracker.getSoldTradeTracker(simpleSoldTrade);
	assertEquals(retrieved.quantity, 1);
});

Deno.test("invalid quantity for acquired trade throws", () => {
	const tracker = new TradeAssociationTracker();
	assertThrows(() => tracker.trackAcquiredQuantity(simpleBuyTrade, 2), Error);
});

Deno.test("invalid quantity for sold trade throws", () => {
	const tracker = new TradeAssociationTracker();
	assertThrows(() => tracker.trackSoldQuantity(simpleSoldTrade, 2), Error);
});
