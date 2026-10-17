import type { Lot } from "@brrr/Core/LotMatching/Lot";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import { TradeAssociationTracker } from "@brrr/Core/LotMatching/TradeAssociationTracker";
import type { TradeEvent } from "@brrr/Core/Schemas/Events";
import type { TaxLot } from "@brrr/Core/Schemas/Lots";

export class ProvidedLotMatchingMethod implements LotMatchingMethod {
	private predefinedLots: TaxLot<TradeEvent, TradeEvent>[];

	constructor(predefinedLots: TaxLot<TradeEvent, TradeEvent>[]) {
		this.predefinedLots = predefinedLots;
	}

	performMatching(_events: Trade[]): Lot[] {
		// Validates that the lots never use more of a trade than it has.
		const tracker = new TradeAssociationTracker();

		const lots = this.predefinedLots;

		for (const lot of lots) {
			const acquiredTrade: Trade = {
				id: lot.acquired.id,
				quantity: lot.acquired.exchangedMoney.underlyingQuantity,
				date: lot.acquired.date,
			};
			tracker.trackAcquiredQuantity(acquiredTrade, lot.quantity);

			const soldTrade: Trade = {
				id: lot.sold.id,
				quantity: lot.sold.exchangedMoney.underlyingQuantity,
				date: lot.sold.date,
			};
			tracker.trackSoldQuantity(soldTrade, -lot.quantity); // NOTE: Lots subtract, as sells remove from holding
		}

		const processedLots: Lot[] = [];
		for (const lot of lots) {
			const acquiredTrade: Trade = {
				id: lot.acquired.id,
				quantity: lot.acquired.exchangedMoney.underlyingQuantity,
				date: lot.acquired.date,
			};
			const soldTrade: Trade = {
				id: lot.sold.id,
				quantity: lot.sold.exchangedMoney.underlyingQuantity,
				date: lot.sold.date,
			};

			processedLots.push({
				quantity: lot.quantity,
				acquired: { date: acquiredTrade.date, relation: acquiredTrade },
				sold: { date: soldTrade.date, relation: soldTrade },
			});
		}

		return processedLots;
	}
}
