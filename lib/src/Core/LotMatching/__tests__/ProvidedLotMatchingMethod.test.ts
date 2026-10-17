import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import {
	GenericAssetClass,
	GenericMonetaryExchangeInformation,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { TaxLot, type TaxLotStock } from "@brrr/Core/Schemas/Lots";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

function makeDate(iso: string): ValidDateTime {
	return DateTime.fromISO(iso) as ValidDateTime;
}

const identifier = new FinancialIdentifier({ isin: "ISIN", ticker: "TICKER", name: "NAME" });

function makeMonetary(qty: number): GenericMonetaryExchangeInformation {
	return new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: qty,
		underlyingTradePrice: 1,
		commissionCurrency: "EUR",
		commissionTotal: 0,
		taxCurrency: "EUR",
		taxTotal: 0,
		fxRateToBase: 1,
	});
}

const simpleLot: TaxLotStock = new TaxLot({
	id: "ID",
	financialIdentifier: identifier,
	quantity: 1,
	acquired: new TradeEventStockAcquired({
		id: "ID",
		financialIdentifier: identifier,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2023-01-01"),
		multiplier: 1,
		exchangedMoney: makeMonetary(1),
		provenance: [],
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	}),
	sold: new TradeEventStockSold({
		id: "ID2",
		financialIdentifier: identifier,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2023-01-02"),
		multiplier: 1,
		exchangedMoney: makeMonetary(-1),
		provenance: [],
	}),
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

const underUtilizedLot: TaxLotStock = new TaxLot({
	id: "ID",
	financialIdentifier: identifier,
	quantity: 1,
	acquired: new TradeEventStockAcquired({
		id: "ID",
		financialIdentifier: identifier,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2023-01-01"),
		multiplier: 1,
		exchangedMoney: makeMonetary(2),
		provenance: [],
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	}),
	sold: new TradeEventStockSold({
		id: "ID2",
		financialIdentifier: identifier,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2023-01-02"),
		multiplier: 1,
		exchangedMoney: makeMonetary(-2),
		provenance: [],
	}),
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

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
