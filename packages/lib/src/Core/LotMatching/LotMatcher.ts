import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { LotLeg, MatchedLot } from "@brrr/Core/LotMatching/MatchedLot";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import type { TradeEventBase } from "@brrr/Core/Schemas/Events";

export class LotMatcher {
	matchLots<T extends TradeEventBase>(method: LotMatchingMethod, events: T[]): MatchedLot<T>[] {
		const tradeEventMappings = new Map<string, T>();
		const tradeMappings = new Map<string, Trade>();

		for (const event of events) {
			const convertedEvent = this.convertTradeEvent(event);
			tradeEventMappings.set(event.id, event);
			tradeMappings.set(convertedEvent.id, convertedEvent);
		}

		return method.performMatching([...tradeMappings.values()]).map((lot) => {
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

	private convertTradeEvent(event: TradeEventBase): Trade {
		return { id: event.id, quantity: event.exchangedMoney.underlyingQuantity, date: event.date };
	}

	// The commission is split in proportion to the quantity the lot takes from the trade.
	private legOf<T extends TradeEventBase>(trade: T, quantity: number): LotLeg<T> {
		return {
			trade,
			quantity,
			commission:
				(1 / trade.exchangedMoney.underlyingQuantity) *
				quantity *
				trade.exchangedMoney.commissionTotal,
		};
	}
}
