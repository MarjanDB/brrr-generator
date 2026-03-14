import type { Lot } from "@brrr/Core/LotMatching/Lot";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

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

test("provided method is called", () => {
	const fakeMethod = new FakeLotMatchingMethod();
	const lotMatcher = new LotMatcher();

	lotMatcher.matchLotsWithTrades(fakeMethod, [
		{ id: "ID", quantity: 1, date: DateTime.fromISO("2023-01-01") as ValidDateTime },
	]);

	expect(fakeMethod.performMatchingCalled).toEqual(true);
	expect(fakeMethod.generateTradesCalled).toEqual(true);
});
