import { Scenario } from "@brrr/__tests__/support/Scenario";
import { CurrencyCode, TaxLotId, TradeEventId } from "@brrr/Core/Models/Identifiers";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { ProvidedLotMatchingMethod } from "@brrr/Core/Services/LotMatching/ProvidedLotMatchingMethod";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";

const { build } = Scenario;

const simpleLot = build.stockTaxLot({
	id: TaxLotId.Schema.parse("ID"),
	quantity: 1,
	shortLongType: ShortLong.LONG,
	acquired: build.stockBought({
		id: TradeEventId.Schema.parse("ID"),
		date: "2023-01-01",
		quantity: 1,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	}),
	sold: build.stockSold({
		id: TradeEventId.Schema.parse("ID2"),
		date: "2023-01-02",
		quantity: -1,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	}),
});

// A lot of 1 over a buy and a sale of 2 each.
const underUtilizedLot = build.stockTaxLot({
	id: TaxLotId.Schema.parse("ID"),
	quantity: 1,
	shortLongType: ShortLong.LONG,
	acquired: build.stockBought({
		id: TradeEventId.Schema.parse("ID"),
		date: "2023-01-01",
		quantity: 2,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	}),
	sold: build.stockSold({
		id: TradeEventId.Schema.parse("ID2"),
		date: "2023-01-02",
		quantity: -2,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	}),
});

test("simple single lot generation", () => {
	const method = new ProvidedLotMatchingMethod([simpleLot], new NullProvenanceRecorder());
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(1);
	expect(lots[0].quantity).toEqual(1);
	expect(lots[0].acquired.relation.date).toEqual(simpleLot.acquired.date);
	expect(lots[0].sold.relation.date).toEqual(simpleLot.sold.date);
});

test("under-utilized lot generation", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot], new NullProvenanceRecorder());
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(1);
	expect(lots[0].quantity).toEqual(underUtilizedLot.quantity);
	expect(lots[0].acquired.relation.id).toEqual(underUtilizedLot.acquired.id);
	expect(lots[0].sold.relation.id).toEqual(underUtilizedLot.sold.id);
});

test("two lots can share the same trades up to their quantity", () => {
	const method = new ProvidedLotMatchingMethod(
		[underUtilizedLot, underUtilizedLot],
		new NullProvenanceRecorder(),
	);
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(2);
	expect(lots.map((lot) => lot.quantity)).toEqual([1, 1]);
});

test("lots that use more than a trade's quantity throw", () => {
	const method = new ProvidedLotMatchingMethod(
		[underUtilizedLot, underUtilizedLot, underUtilizedLot],
		new NullProvenanceRecorder(),
	);

	expect(() => method.performMatching([])).toThrow(Error);
});

test("matching twice with the same method gives the same lots", () => {
	const method = new ProvidedLotMatchingMethod(
		[underUtilizedLot, underUtilizedLot],
		new NullProvenanceRecorder(),
	);

	expect(method.performMatching([])).toEqual(method.performMatching([]));
});
