import type { Lot } from "./Lot.ts";
import type { LotMatchingMethod } from "./LotMatchingMethod.ts";
import type { Trade } from "./Trade.ts";
import { TradeAssociationTracker } from "./TradeAssociationTracker.ts";
import type { TaxLot } from "@brrr/Core/Schemas/Lots.ts";
import type { TradeEvent } from "@brrr/Core/Schemas/Events.ts";

export class ProvidedLotMatchingMethod implements LotMatchingMethod {
	private tradeAssociationTracker: TradeAssociationTracker = new TradeAssociationTracker();
	private predefinedLots: TaxLot<TradeEvent, TradeEvent>[];

	constructor(predefinedLots: TaxLot<TradeEvent, TradeEvent>[]) {
		this.predefinedLots = predefinedLots;
	}

	performMatching(_events: Trade[]): Lot[] {
		this.tradeAssociationTracker = new TradeAssociationTracker();

		const lots = this.predefinedLots;

		for (const lot of lots) {
			const acquiredTrade: Trade = {
				id: lot.acquired.id,
				quantity: lot.acquired.exchangedMoney.underlyingQuantity,
				date: lot.acquired.date,
			};
			this.tradeAssociationTracker.trackAcquiredQuantity(acquiredTrade, lot.quantity);

			const soldTrade: Trade = {
				id: lot.sold.id,
				quantity: lot.sold.exchangedMoney.underlyingQuantity,
				date: lot.sold.date,
			};
			this.tradeAssociationTracker.trackSoldQuantity(soldTrade, -lot.quantity);
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

	generateTradesFromLotsWithTracking(lots: Lot[]): Trade[] {
		const processedTrades = new Map<string, Trade>();

		for (const lot of lots) {
			const acquiredTrade = lot.acquired.relation;
			const acquiredTracking = this.tradeAssociationTracker.getAcquiredTradeTracker(acquiredTrade);
			processedTrades.set(acquiredTrade.id, {
				id: acquiredTrade.id,
				quantity: acquiredTracking.quantity,
				date: acquiredTrade.date,
			});

			const soldTrade = lot.sold.relation;
			const soldTracking = this.tradeAssociationTracker.getSoldTradeTracker(soldTrade);
			processedTrades.set(soldTrade.id, {
				id: soldTrade.id,
				quantity: soldTracking.quantity,
				date: soldTrade.date,
			});
		}

		return [...processedTrades.values()].sort((a, b) => a.date.toMillis() - b.date.toMillis());
	}
}
