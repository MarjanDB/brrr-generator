import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import type { TradeEventBase } from "@brrr/Core/Models/Events/TradeEventBase";
import type { TradeEventId } from "@brrr/Core/Models/Identifiers";
import type { LotLeg } from "@brrr/Core/Models/LotMatching/LotLeg";
import type { MatchedLot } from "@brrr/Core/Models/LotMatching/MatchedLot";
import type { Trade } from "@brrr/Core/Models/LotMatching/Trade";

import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";

export class LotMatcher {
	public matchLots<T extends TradeEventBase>(
		method: ILotMatchingMethod,
		events: T[],
		_provenance: IProvenanceRecorder,
	): MatchedLot<T>[] {
		const tradeEventMappings = new Map<TradeEventId, T>();
		const tradeMappings = new Map<TradeEventId, Trade>();

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
		return { id: event.id, quantity: event.exchangedMoney.quantity, date: event.date };
	}

	// The commission is split in proportion to the quantity the lot takes from the trade.
	private legOf<T extends TradeEventBase>(trade: T, quantity: number): LotLeg<T> {
		return {
			trade,
			quantity,
			commission:
				(1 / trade.exchangedMoney.quantity) * quantity * trade.exchangedMoney.commissionInBase,
		};
	}
}
