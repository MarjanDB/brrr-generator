import type { Trade } from "@brrr/Core/LotMatching/Trade";
import { TradeAssociationTracker } from "@brrr/Core/LotMatching/TradeAssociationTracker";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

const simpleBuyTrade: Trade = { id: "ID", quantity: 1, date: DateTime.fromISO("2023-01-01") as ValidDateTime };
const simpleSoldTrade: Trade = { id: "ID2", quantity: -1, date: DateTime.fromISO("2023-01-01") as ValidDateTime };

test("retrieval of tracker for simple acquired trade", () => {
	const tracker = new TradeAssociationTracker();
	tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5);
	const retrieved = tracker.getAcquiredTradeTracker(simpleBuyTrade);
	expect(retrieved.quantity).toEqual(0.5);
});

test("retrieval of tracker for simple sold trade", () => {
	const tracker = new TradeAssociationTracker();
	tracker.trackSoldQuantity(simpleSoldTrade, 0.5);
	const retrieved = tracker.getSoldTradeTracker(simpleSoldTrade);
	expect(retrieved.quantity).toEqual(0.5);
});

test("summation of quantity for acquired trade", () => {
	const tracker = new TradeAssociationTracker();
	tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5);
	tracker.trackAcquiredQuantity(simpleBuyTrade, 0.5);
	const retrieved = tracker.getAcquiredTradeTracker(simpleBuyTrade);
	expect(retrieved.quantity).toEqual(1);
});

test("summation of quantity for sold trade", () => {
	const tracker = new TradeAssociationTracker();
	tracker.trackSoldQuantity(simpleSoldTrade, 0.5);
	tracker.trackSoldQuantity(simpleSoldTrade, 0.5);
	const retrieved = tracker.getSoldTradeTracker(simpleSoldTrade);
	expect(retrieved.quantity).toEqual(1);
});

test("invalid quantity for acquired trade throws", () => {
	const tracker = new TradeAssociationTracker();
	expect(() => tracker.trackAcquiredQuantity(simpleBuyTrade, 2)).toThrow(Error);
});

test("invalid quantity for sold trade throws", () => {
	const tracker = new TradeAssociationTracker();
	expect(() => tracker.trackSoldQuantity(simpleSoldTrade, 2)).toThrow(Error);
});
