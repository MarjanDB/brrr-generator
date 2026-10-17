import type { Lot } from "@brrr/Core/LotMatching/Lot";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { LotLeg, MatchedLot } from "@brrr/Core/LotMatching/MatchedLot";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import type { TradeEvent } from "@brrr/Core/Schemas/Events";

export type LotMatchingDetails = {
	lots: Lot[];
	trades: Trade[];
};

export class LotMatcher {
	matchLotsWithTrades(method: LotMatchingMethod, events: Trade[]): LotMatchingDetails {
		const lots = method.performMatching(events);
		const trades = method.generateTradesFromLotsWithTracking(lots);
		return { lots, trades };
	}

	matchLots<T extends TradeEvent>(method: LotMatchingMethod, events: T[]): MatchedLot<T>[] {
		const tradeEventMappings = new Map<string, T>();
		const tradeMappings = new Map<string, Trade>();

		for (const event of events) {
			const convertedEvent = this.convertTradeEvent(event);
			tradeEventMappings.set(event.id, event);
			tradeMappings.set(convertedEvent.id, convertedEvent);
		}

		const matchingDetails = this.matchLotsWithTrades(method, [...tradeMappings.values()]);

		return matchingDetails.lots.map((lot) => {
			const acquiredTrade = tradeEventMappings.get(lot.acquired.relation.id);
			const soldTrade = tradeEventMappings.get(lot.sold.relation.id);

			if (!acquiredTrade || !soldTrade) {
				throw new Error("Acquired Trade or Sold Trade is missing lookup");
			}

			return {
				acquired: this.legOf(acquiredTrade, lot.quantity),
				sold: this.legOf(soldTrade, -lot.quantity),
			};
		});
	}

	private convertTradeEvent(event: TradeEvent): Trade {
		return { id: event.id, quantity: event.exchangedMoney.underlyingQuantity, date: event.date };
	}

	// The commission is split in proportion to the quantity the lot takes from the trade.
	private legOf<T extends TradeEvent>(trade: T, quantity: number): LotLeg<T> {
		return {
			trade,
			quantity,
			commission:
				(1 / trade.exchangedMoney.underlyingQuantity) *
				quantity *
				trade.exchangedMoney.comissionTotal,
		};
	}
}
