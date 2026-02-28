import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import { LotMatcher } from "@brrr/core/lotMatching/LotMatcher.ts";
import type { LotMatchingMethod } from "@brrr/core/lotMatching/LotMatchingMethod.ts";
import type { Lot } from "@brrr/core/lotMatching/Lot.ts";
import type { Trade } from "@brrr/core/lotMatching/Trade.ts";

class FakeLotMatchingMethod implements LotMatchingMethod {
	performMatchingCalled = false;
	generateTradesCalled = false;

	performMatching(_events: Trade[]): Lot[] {
		this.performMatchingCalled = true;
		return [];
	}

	generateTradesFromLotsWithTracking(_lots: Lot[]): Trade[] {
		this.generateTradesCalled = true;
		return [];
	}
}

Deno.test("provided method is called", () => {
	const fakeMethod = new FakeLotMatchingMethod();
	const lotMatcher = new LotMatcher();

	lotMatcher.matchLotsWithTrades(fakeMethod, [
		{ id: "ID", quantity: 1, date: DateTime.fromISO("2023-01-01")! },
	]);

	assertEquals(fakeMethod.performMatchingCalled, true);
	assertEquals(fakeMethod.generateTradesCalled, true);
});
