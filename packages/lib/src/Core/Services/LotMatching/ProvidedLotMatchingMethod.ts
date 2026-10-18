import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import type { TradeEvent } from "@brrr/Core/Models/Events/TradeEvent";
import type { Lot } from "@brrr/Core/Models/LotMatching/Lot";
import type { Trade } from "@brrr/Core/Models/LotMatching/Trade";
import type { TaxLot } from "@brrr/Core/Models/Lots/TaxLot";
import { TradeAssociationTracker } from "@brrr/Core/Services/LotMatching/TradeAssociationTracker";

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
