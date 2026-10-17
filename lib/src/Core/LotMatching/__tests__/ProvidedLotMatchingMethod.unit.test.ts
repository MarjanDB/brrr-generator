import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";

const { build } = Scenario;

// A lot of `quantity` over a buy and a sale of `tradeQuantity` each.
function lot(quantity: number, tradeQuantity: number) {
	return build.stockTaxLot({
		id: "ID",
		quantity,
		acquired: build.stockBought({ id: "ID", date: "2023-01-01", quantity: tradeQuantity }),
		sold: build.stockSold({ id: "ID2", date: "2023-01-02", quantity: -tradeQuantity }),
	});
}

const simpleLot = lot(1, 1);
const underUtilizedLot = lot(1, 2);

test("simple single lot generation", () => {
	const method = new ProvidedLotMatchingMethod([simpleLot]);
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(1);
	expect(lots[0].quantity).toEqual(1);
	expect(lots[0].acquired.relation.date).toEqual(simpleLot.acquired.date);
	expect(lots[0].sold.relation.date).toEqual(simpleLot.sold.date);
});

test("under-utilized lot generation", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot]);
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(1);
	expect(lots[0].quantity).toEqual(underUtilizedLot.quantity);
	expect(lots[0].acquired.relation.id).toEqual(underUtilizedLot.acquired.id);
	expect(lots[0].sold.relation.id).toEqual(underUtilizedLot.sold.id);
});

test("two lots can share the same trades up to their quantity", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot, underUtilizedLot]);
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(2);
	expect(lots.map((lot) => lot.quantity)).toEqual([1, 1]);
});

test("lots that use more than a trade's quantity throw", () => {
	const method = new ProvidedLotMatchingMethod([
		underUtilizedLot,
		underUtilizedLot,
		underUtilizedLot,
	]);

	expect(() => method.performMatching([])).toThrow(Error);
});

test("matching twice with the same method gives the same lots", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot, underUtilizedLot]);

	expect(method.performMatching([])).toEqual(method.performMatching([]));
});
