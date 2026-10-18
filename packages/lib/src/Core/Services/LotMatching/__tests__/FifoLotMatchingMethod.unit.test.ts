import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TradeEventId } from "@brrr/Core/Models/Identifiers";
import type { Trade } from "@brrr/Core/Models/LotMatching/Trade";
import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";

const simpleCaseNoProfit = {
	Buy: {
		id: TradeEventId.Schema.parse("ID"),
		quantity: 1,
		date: Scenario.build.date("2023-01-01"),
	},
	Sell: {
		id: TradeEventId.Schema.parse("ID2"),
		quantity: -1,
		date: Scenario.build.date("2023-01-02"),
	},
};

const simpleCaseWithMultipleSellEvents = {
	Buy: {
		id: TradeEventId.Schema.parse("ID"),
		quantity: 2,
		date: Scenario.build.date("2023-01-01"),
	},
	Sell: {
		id: TradeEventId.Schema.parse("ID2"),
		quantity: -1,
		date: Scenario.build.date("2023-01-02"),
	},
	Sell2: {
		id: TradeEventId.Schema.parse("ID3"),
		quantity: -1,
		date: Scenario.build.date("2023-01-03"),
	},
};

const simpleCaseWithMultipleBuyEvents = {
	Buy: {
		id: TradeEventId.Schema.parse("ID"),
		quantity: 1,
		date: Scenario.build.date("2023-01-01"),
	},
	Buy2: {
		id: TradeEventId.Schema.parse("ID2"),
		quantity: 1,
		date: Scenario.build.date("2023-01-02"),
	},
	Sell: {
		id: TradeEventId.Schema.parse("ID3"),
		quantity: -2,
		date: Scenario.build.date("2023-01-02"),
	},
};

const simpleCaseWithBuySellBuySellEvents = {
	Buy1: {
		id: TradeEventId.Schema.parse("ID"),
		quantity: 1,
		date: Scenario.build.date("2023-01-01"),
	},
	Sell1: {
		id: TradeEventId.Schema.parse("ID2"),
		quantity: -1,
		date: Scenario.build.date("2023-01-02"),
	},
	Buy2: {
		id: TradeEventId.Schema.parse("ID3"),
		quantity: 1,
		date: Scenario.build.date("2023-01-03"),
	},
	Sell2: {
		id: TradeEventId.Schema.parse("ID4"),
		quantity: -1,
		date: Scenario.build.date("2023-01-04"),
	},
};

const complexCaseOverlappingEvents = {
	Buy1: {
		id: TradeEventId.Schema.parse("ID1"),
		quantity: 2,
		date: Scenario.build.date("2023-01-01"),
	},
	Sell1: {
		id: TradeEventId.Schema.parse("ID2"),
		quantity: -1,
		date: Scenario.build.date("2023-01-02"),
	},
	Buy2: {
		id: TradeEventId.Schema.parse("ID3"),
		quantity: 1,
		date: Scenario.build.date("2023-01-03"),
	},
	Sell2: {
		id: TradeEventId.Schema.parse("ID4"),
		quantity: -2,
		date: Scenario.build.date("2023-01-04"),
	},
};

const complexCasePartialBuys = {
	Buy1: {
		id: TradeEventId.Schema.parse("ID1"),
		quantity: 0.5,
		date: Scenario.build.date("2023-01-01"),
	},
	Buy2: {
		id: TradeEventId.Schema.parse("ID2"),
		quantity: 0.5,
		date: Scenario.build.date("2023-01-02"),
	},
	Sell: {
		id: TradeEventId.Schema.parse("ID3"),
		quantity: -1,
		date: Scenario.build.date("2023-01-03"),
	},
};

const complexCasePartialSells = {
	Buy: {
		id: TradeEventId.Schema.parse("ID1"),
		quantity: 1,
		date: Scenario.build.date("2023-01-01"),
	},
	Sell1: {
		id: TradeEventId.Schema.parse("ID2"),
		quantity: -0.5,
		date: Scenario.build.date("2023-01-02"),
	},
	Sell2: {
		id: TradeEventId.Schema.parse("ID3"),
		quantity: -0.5,
		date: Scenario.build.date("2023-01-03"),
	},
};

test("simple single lot generation", () => {
	const method = new FifoLotMatchingMethod();
	const events = [simpleCaseNoProfit.Buy, simpleCaseNoProfit.Sell];
	const lots = method.performMatching(events);

	expect(lots.length).toEqual(1);
	expect(lots[0].quantity).toEqual(1);
	expect(lots[0].acquired.relation.date).toEqual(simpleCaseNoProfit.Buy.date);
	expect(lots[0].sold.relation.date).toEqual(simpleCaseNoProfit.Sell.date);
});

test("simple single lot generation with multiple buy-sell events", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		simpleCaseWithBuySellBuySellEvents.Buy1,
		simpleCaseWithBuySellBuySellEvents.Sell1,
		simpleCaseWithBuySellBuySellEvents.Buy2,
		simpleCaseWithBuySellBuySellEvents.Sell2,
	];
	const lots = method.performMatching(events);

	expect(lots.length).toEqual(2);
	expect(lots[0].quantity).toEqual(1);
	expect(lots[0].acquired.relation).toEqual(simpleCaseWithBuySellBuySellEvents.Buy1);
	expect(lots[0].sold.relation).toEqual(simpleCaseWithBuySellBuySellEvents.Sell1);

	expect(lots[1].quantity).toEqual(1);
	expect(lots[1].acquired.relation).toEqual(simpleCaseWithBuySellBuySellEvents.Buy2);
	expect(lots[1].sold.relation).toEqual(simpleCaseWithBuySellBuySellEvents.Sell2);
});

test("multiple buy events", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		simpleCaseWithMultipleBuyEvents.Buy,
		simpleCaseWithMultipleBuyEvents.Buy2,
		simpleCaseWithMultipleBuyEvents.Sell,
	];
	const lots = method.performMatching(events);

	expect(lots.length).toEqual(2);
	expect(lots[0].quantity).toEqual(simpleCaseWithMultipleBuyEvents.Buy.quantity);
	expect(lots[0].acquired.relation.id).toEqual(simpleCaseWithMultipleBuyEvents.Buy.id);
	expect(lots[0].sold.relation.id).toEqual(simpleCaseWithMultipleBuyEvents.Sell.id);

	expect(lots[1].quantity).toEqual(simpleCaseWithMultipleBuyEvents.Buy2.quantity);
	expect(lots[1].acquired.relation.id).toEqual(simpleCaseWithMultipleBuyEvents.Buy2.id);
	expect(lots[1].sold.relation.id).toEqual(simpleCaseWithMultipleBuyEvents.Sell.id);
});

test("multiple sell events", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		simpleCaseWithMultipleSellEvents.Buy,
		simpleCaseWithMultipleSellEvents.Sell,
		simpleCaseWithMultipleSellEvents.Sell2,
	];
	const lots = method.performMatching(events);

	expect(lots.length).toEqual(2);
	expect(lots[0].quantity).toEqual(Math.abs(simpleCaseWithMultipleSellEvents.Sell.quantity));
	expect(lots[0].acquired.relation.id).toEqual(simpleCaseWithMultipleSellEvents.Buy.id);
	expect(lots[0].sold.relation.id).toEqual(simpleCaseWithMultipleSellEvents.Sell.id);

	expect(lots[1].quantity).toEqual(Math.abs(simpleCaseWithMultipleSellEvents.Sell2.quantity));
	expect(lots[1].acquired.relation.id).toEqual(simpleCaseWithMultipleSellEvents.Buy.id);
	expect(lots[1].sold.relation.id).toEqual(simpleCaseWithMultipleSellEvents.Sell2.id);
});

test("complex overlapping events", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		complexCaseOverlappingEvents.Buy1,
		complexCaseOverlappingEvents.Sell1,
		complexCaseOverlappingEvents.Buy2,
		complexCaseOverlappingEvents.Sell2,
	];
	const lots = method.performMatching(events);

	expect(lots.length).toEqual(3);

	expect(lots[0].quantity).toEqual(1);
	expect(lots[0].acquired.relation).toEqual(complexCaseOverlappingEvents.Buy1);
	expect(lots[0].sold.relation).toEqual(complexCaseOverlappingEvents.Sell1);

	expect(lots[1].quantity).toEqual(1);
	expect(lots[1].acquired.relation).toEqual(complexCaseOverlappingEvents.Buy1);
	expect(lots[1].sold.relation).toEqual(complexCaseOverlappingEvents.Sell2);

	expect(lots[2].quantity).toEqual(1);
	expect(lots[2].acquired.relation).toEqual(complexCaseOverlappingEvents.Buy2);
	expect(lots[2].sold.relation).toEqual(complexCaseOverlappingEvents.Sell2);
});

test("complex partial buys", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		complexCasePartialBuys.Buy1,
		complexCasePartialBuys.Buy2,
		complexCasePartialBuys.Sell,
	];
	const lots = method.performMatching(events);

	expect(lots.length).toEqual(2);

	expect(lots[0].quantity).toEqual(0.5);
	expect(lots[0].acquired.relation).toEqual(complexCasePartialBuys.Buy1);
	expect(lots[0].sold.relation).toEqual(complexCasePartialBuys.Sell);

	expect(lots[1].quantity).toEqual(0.5);
	expect(lots[1].acquired.relation).toEqual(complexCasePartialBuys.Buy2);
	expect(lots[1].sold.relation).toEqual(complexCasePartialBuys.Sell);
});

test("complex partial sells", () => {
	const method = new FifoLotMatchingMethod();
	const events = [
		complexCasePartialSells.Buy,
		complexCasePartialSells.Sell1,
		complexCasePartialSells.Sell2,
	];
	const lots = method.performMatching(events);

	expect(lots.length).toEqual(2);

	expect(lots[0].quantity).toEqual(0.5);
	expect(lots[0].acquired.relation).toEqual(complexCasePartialSells.Buy);
	expect(lots[0].sold.relation).toEqual(complexCasePartialSells.Sell1);

	expect(lots[1].quantity).toEqual(0.5);
	expect(lots[1].acquired.relation).toEqual(complexCasePartialSells.Buy);
	expect(lots[1].sold.relation).toEqual(complexCasePartialSells.Sell2);
});

// Shorts aren't supported: a short covered in several fills makes a lot whose acquired side is
// the sell. Matching must fail rather than hand that lot to a report.
test("a short position covered in several fills throws", () => {
	const method = new FifoLotMatchingMethod();
	const events: Trade[] = [
		{ id: TradeEventId.Schema.parse("S1"), quantity: -10, date: Scenario.build.date("2023-01-01") },
		{ id: TradeEventId.Schema.parse("B1"), quantity: 5, date: Scenario.build.date("2023-01-02") },
		{ id: TradeEventId.Schema.parse("B2"), quantity: 5, date: Scenario.build.date("2023-01-03") },
	];

	expect(() => method.performMatching(events)).toThrow("Tracker for event (S1) does not exist");
});
