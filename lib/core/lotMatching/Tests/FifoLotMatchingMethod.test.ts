import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import { FifoLotMatchingMethod } from "@brrr/core/lotMatching/FifoLotMatchingMethod.ts";
import type { Trade } from "@brrr/core/lotMatching/Trade.ts";

function makeDate(iso: string) {
	return DateTime.fromISO(iso)!;
}

const simpleCaseNoProfit = {
	Buy: { id: "ID", quantity: 1, date: makeDate("2023-01-01") } as Trade,
	Sell: { id: "ID2", quantity: -1, date: makeDate("2023-01-02") } as Trade,
};

const simpleCaseWithMultipleSellEvents = {
	Buy: { id: "ID", quantity: 2, date: makeDate("2023-01-01") } as Trade,
	Sell: { id: "ID2", quantity: -1, date: makeDate("2023-01-02") } as Trade,
	Sell2: { id: "ID3", quantity: -1, date: makeDate("2023-01-03") } as Trade,
};

const simpleCaseWithMultipleBuyEvents = {
	Buy: { id: "ID", quantity: 1, date: makeDate("2023-01-01") } as Trade,
	Buy2: { id: "ID2", quantity: 1, date: makeDate("2023-01-02") } as Trade,
	Sell: { id: "ID3", quantity: -2, date: makeDate("2023-01-02") } as Trade,
};

const simpleCaseWithBuySellBuySellEvents = {
	Buy1: { id: "ID", quantity: 1, date: makeDate("2023-01-01") } as Trade,
	Sell1: { id: "ID2", quantity: -1, date: makeDate("2023-01-02") } as Trade,
	Buy2: { id: "ID3", quantity: 1, date: makeDate("2023-01-03") } as Trade,
	Sell2: { id: "ID4", quantity: -1, date: makeDate("2023-01-04") } as Trade,
};

const complexCaseOverlappingEvents = {
	Buy1: { id: "ID1", quantity: 2, date: makeDate("2023-01-01") } as Trade,
	Sell1: { id: "ID2", quantity: -1, date: makeDate("2023-01-02") } as Trade,
	Buy2: { id: "ID3", quantity: 1, date: makeDate("2023-01-03") } as Trade,
	Sell2: { id: "ID4", quantity: -2, date: makeDate("2023-01-04") } as Trade,
};

const complexCasePartialBuys = {
	Buy1: { id: "ID1", quantity: 0.5, date: makeDate("2023-01-01") } as Trade,
	Buy2: { id: "ID2", quantity: 0.5, date: makeDate("2023-01-02") } as Trade,
	Sell: { id: "ID3", quantity: -1, date: makeDate("2023-01-03") } as Trade,
};

const complexCasePartialSells = {
	Buy: { id: "ID1", quantity: 1, date: makeDate("2023-01-01") } as Trade,
	Sell1: { id: "ID2", quantity: -0.5, date: makeDate("2023-01-02") } as Trade,
	Sell2: { id: "ID3", quantity: -0.5, date: makeDate("2023-01-03") } as Trade,
};

Deno.test("simple single lot generation", () => {
	const method = new FifoLotMatchingMethod();
	const events = [simpleCaseNoProfit.Buy, simpleCaseNoProfit.Sell];
	const lots = method.performMatching(events);

	assertEquals(lots.length, 1);
	assertEquals(lots[0].quantity, 1);
	assertEquals(lots[0].acquired.relation.date, simpleCaseNoProfit.Buy.date);
	assertEquals(lots[0].sold.relation.date, simpleCaseNoProfit.Sell.date);
});

Deno.test("simple single lot generation with multiple buy-sell events", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		simpleCaseWithBuySellBuySellEvents.Buy1,
		simpleCaseWithBuySellBuySellEvents.Sell1,
		simpleCaseWithBuySellBuySellEvents.Buy2,
		simpleCaseWithBuySellBuySellEvents.Sell2,
	];
	const lots = method.performMatching(events);

	assertEquals(lots.length, 2);
	assertEquals(lots[0].quantity, 1);
	assertEquals(lots[0].acquired.relation, simpleCaseWithBuySellBuySellEvents.Buy1);
	assertEquals(lots[0].sold.relation, simpleCaseWithBuySellBuySellEvents.Sell1);

	assertEquals(lots[1].quantity, 1);
	assertEquals(lots[1].acquired.relation, simpleCaseWithBuySellBuySellEvents.Buy2);
	assertEquals(lots[1].sold.relation, simpleCaseWithBuySellBuySellEvents.Sell2);
});

Deno.test("multiple buy events", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		simpleCaseWithMultipleBuyEvents.Buy,
		simpleCaseWithMultipleBuyEvents.Buy2,
		simpleCaseWithMultipleBuyEvents.Sell,
	];
	const lots = method.performMatching(events);

	assertEquals(lots.length, 2);
	assertEquals(lots[0].quantity, simpleCaseWithMultipleBuyEvents.Buy.quantity);
	assertEquals(lots[0].acquired.relation.id, simpleCaseWithMultipleBuyEvents.Buy.id);
	assertEquals(lots[0].sold.relation.id, simpleCaseWithMultipleBuyEvents.Sell.id);

	assertEquals(lots[1].quantity, simpleCaseWithMultipleBuyEvents.Buy2.quantity);
	assertEquals(lots[1].acquired.relation.id, simpleCaseWithMultipleBuyEvents.Buy2.id);
	assertEquals(lots[1].sold.relation.id, simpleCaseWithMultipleBuyEvents.Sell.id);
});

Deno.test("multiple sell events", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		simpleCaseWithMultipleSellEvents.Buy,
		simpleCaseWithMultipleSellEvents.Sell,
		simpleCaseWithMultipleSellEvents.Sell2,
	];
	const lots = method.performMatching(events);

	assertEquals(lots.length, 2);
	assertEquals(lots[0].quantity, Math.abs(simpleCaseWithMultipleSellEvents.Sell.quantity));
	assertEquals(lots[0].acquired.relation.id, simpleCaseWithMultipleSellEvents.Buy.id);
	assertEquals(lots[0].sold.relation.id, simpleCaseWithMultipleSellEvents.Sell.id);

	assertEquals(lots[1].quantity, Math.abs(simpleCaseWithMultipleSellEvents.Sell2.quantity));
	assertEquals(lots[1].acquired.relation.id, simpleCaseWithMultipleSellEvents.Buy.id);
	assertEquals(lots[1].sold.relation.id, simpleCaseWithMultipleSellEvents.Sell2.id);
});

Deno.test("complex overlapping events", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		complexCaseOverlappingEvents.Buy1,
		complexCaseOverlappingEvents.Sell1,
		complexCaseOverlappingEvents.Buy2,
		complexCaseOverlappingEvents.Sell2,
	];
	const lots = method.performMatching(events);

	assertEquals(lots.length, 3);

	assertEquals(lots[0].quantity, 1);
	assertEquals(lots[0].acquired.relation, complexCaseOverlappingEvents.Buy1);
	assertEquals(lots[0].sold.relation, complexCaseOverlappingEvents.Sell1);

	assertEquals(lots[1].quantity, 1);
	assertEquals(lots[1].acquired.relation, complexCaseOverlappingEvents.Buy1);
	assertEquals(lots[1].sold.relation, complexCaseOverlappingEvents.Sell2);

	assertEquals(lots[2].quantity, 1);
	assertEquals(lots[2].acquired.relation, complexCaseOverlappingEvents.Buy2);
	assertEquals(lots[2].sold.relation, complexCaseOverlappingEvents.Sell2);
});

Deno.test("complex partial buys", () => {
	const method = new FifoLotMatchingMethod();
	const events = [complexCasePartialBuys.Buy1, complexCasePartialBuys.Buy2, complexCasePartialBuys.Sell];
	const lots = method.performMatching(events);

	assertEquals(lots.length, 2);

	assertEquals(lots[0].quantity, 0.5);
	assertEquals(lots[0].acquired.relation, complexCasePartialBuys.Buy1);
	assertEquals(lots[0].sold.relation, complexCasePartialBuys.Sell);

	assertEquals(lots[1].quantity, 0.5);
	assertEquals(lots[1].acquired.relation, complexCasePartialBuys.Buy2);
	assertEquals(lots[1].sold.relation, complexCasePartialBuys.Sell);
});

Deno.test("complex partial sells", () => {
	const method = new FifoLotMatchingMethod();
	const events = [complexCasePartialSells.Buy, complexCasePartialSells.Sell1, complexCasePartialSells.Sell2];
	const lots = method.performMatching(events);

	assertEquals(lots.length, 2);

	assertEquals(lots[0].quantity, 0.5);
	assertEquals(lots[0].acquired.relation, complexCasePartialSells.Buy);
	assertEquals(lots[0].sold.relation, complexCasePartialSells.Sell1);

	assertEquals(lots[1].quantity, 0.5);
	assertEquals(lots[1].acquired.relation, complexCasePartialSells.Buy);
	assertEquals(lots[1].sold.relation, complexCasePartialSells.Sell2);
});
