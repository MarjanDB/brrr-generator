import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import type { TradeEventBase } from "@brrr/Core/Models/Events/TradeEventBase";
import type { TradeEventId } from "@brrr/Core/Models/Identifiers";
import type { LotLeg } from "@brrr/Core/Models/LotMatching/LotLeg";
import type { MatchedLot } from "@brrr/Core/Models/LotMatching/MatchedLot";
import type { Trade } from "@brrr/Core/Models/LotMatching/Trade";

import { ProvenanceFields } from "@brrr/Core/Utils/ProvenanceFields";
import { ProvenanceLabels } from "@brrr/Core/Utils/ProvenanceLabels";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceLegSide } from "@brrr/Provenance/Models/ProvenanceLegSide";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";

const STAGE = ProvenanceStage.Schema.parse("LotMatcher");

export class LotMatcher {
	public matchLots<T extends TradeEventBase>(
		method: ILotMatchingMethod,
		events: T[],
		provenance: IProvenanceRecorder,
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

			const matched = {
				acquired: this.legOf(acquiredTrade, lot.quantity),
				sold: this.legOf(soldTrade, -lot.quantity),
			};

			// The provided method has recorded its lots already; recording is idempotent.
			provenance.node(
				lot,
				ProvenanceNodeKind.MATCHED_LOT,
				ProvenanceLabels.matchedLot(acquiredTrade.id, soldTrade.id, lot.quantity),
				ProvenanceFields.matchedLot(lot.quantity),
			);
			provenance.derive([acquiredTrade, soldTrade], lot, ProvenanceChange.MATCHED, STAGE, null);
			provenance.node(
				matched.acquired,
				ProvenanceNodeKind.LEG,
				ProvenanceLabels.leg(matched.acquired.trade.id, matched.acquired.quantity),
				ProvenanceFields.leg(ProvenanceLegSide.ACQUIRED, matched.acquired.quantity),
			);
			provenance.derive([lot], matched.acquired, ProvenanceChange.MATCHED, STAGE, null);
			provenance.node(
				matched.sold,
				ProvenanceNodeKind.LEG,
				ProvenanceLabels.leg(matched.sold.trade.id, matched.sold.quantity),
				ProvenanceFields.leg(ProvenanceLegSide.SOLD, matched.sold.quantity),
			);
			provenance.derive([lot], matched.sold, ProvenanceChange.MATCHED, STAGE, null);

			return matched;
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
