import type { Lot } from "@brrr/Core/LotMatching/Lot";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import {
	GenericAssetClass,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired } from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

class FakeLotMatchingMethod implements LotMatchingMethod {
	receivedTrades: Trade[] | null = null;

	performMatching(trades: Trade[]): Lot[] {
		this.receivedTrades = trades;
		return [];
	}
}

test("provided method is called with the converted trades", () => {
	const fakeMethod = new FakeLotMatchingMethod();
	const lotMatcher = new LotMatcher();
	const date = DateTime.fromISO("2023-01-01") as ValidDateTime;
	const event = new TradeEventStockAcquired({
		id: "ID",
		financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
		assetClass: GenericAssetClass.STOCK,
		date,
		multiplier: 1,
		exchangedMoney: new GenericMonetaryExchangeInformation({
			underlyingCurrency: "EUR",
			underlyingQuantity: 1,
			underlyingTradePrice: 1,
			commissionCurrency: "EUR",
			commissionTotal: 0,
			taxCurrency: "EUR",
			taxTotal: 0,
			fxRateToBase: 1,
		}),
		provenance: [],
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	});

	const details = lotMatcher.matchLotsWithGenericTradeEvents(fakeMethod, [event]);

	expect(fakeMethod.receivedTrades).toEqual([{ id: "ID", quantity: 1, date }]);
	expect(details.lots).toEqual([]);
	expect(details.trades).toEqual([]);
});
