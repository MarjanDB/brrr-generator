import type { ILotMatchingMethod } from "@brrr/Core/LotMatching/ILotMatchingMethod";
import type { Lot } from "@brrr/Core/LotMatching/Lot";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import { TradeAssociationTracker } from "@brrr/Core/LotMatching/TradeAssociationTracker";
import type { TradeEvent } from "@brrr/Core/Schemas/Events/TradeEvent";
import type { TaxLot } from "@brrr/Core/Schemas/Lots/TaxLot";

export class ProvidedLotMatchingMethod implements ILotMatchingMethod {
	private predefinedLots: TaxLot<TradeEvent, TradeEvent>[];

	public constructor(predefinedLots: TaxLot<TradeEvent, TradeEvent>[]) {
		this.predefinedLots = predefinedLots;
	}

	public performMatching(_events: Trade[]): Lot[] {
		// Validates that the lots never use more of a trade than it has.
		const tracker = new TradeAssociationTracker();

		const lots = this.predefinedLots;

		for (const lot of lots) {
			const acquiredTrade: Trade = {
				id: lot.acquired.id,
				quantity: lot.acquired.exchangedMoney.quantity,
				date: lot.acquired.date,
			};
			tracker.trackAcquiredQuantity(acquiredTrade, lot.quantity);

			const soldTrade: Trade = {
				id: lot.sold.id,
				quantity: lot.sold.exchangedMoney.quantity,
				date: lot.sold.date,
			};
			tracker.trackSoldQuantity(soldTrade, -lot.quantity); // NOTE: Lots subtract, as sells remove from holding
		}

		const processedLots: Lot[] = [];
		for (const lot of lots) {
			const acquiredTrade: Trade = {
				id: lot.acquired.id,
				quantity: lot.acquired.exchangedMoney.quantity,
				date: lot.acquired.date,
			};
			const soldTrade: Trade = {
				id: lot.sold.id,
				quantity: lot.sold.exchangedMoney.quantity,
				date: lot.sold.date,
			};

			processedLots.push({
				quantity: lot.quantity,
				acquired: { relation: acquiredTrade },
				sold: { relation: soldTrade },
			});
		}

		return processedLots;
	}
}
