import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod.ts";
import type { Lot } from "@brrr/Core/LotMatching/Lot.ts";
import type { Trade } from "@brrr/Core/LotMatching/Trade.ts";

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
		{ id: "ID", quantity: 1, date: DateTime.fromISO("2023-01-01") as ValidDateTime },
	]);

	assertEquals(fakeMethod.performMatchingCalled, true);
	assertEquals(fakeMethod.generateTradesCalled, true);
});
