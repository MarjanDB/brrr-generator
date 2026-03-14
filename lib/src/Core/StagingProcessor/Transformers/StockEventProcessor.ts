import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { type StagingTradeEventStock, StagingTradeEventStockAcquired } from "@brrr/Core/Schemas/Staging/Events";

// TODO: Create trade events based on corporate events (mergers can lead to "sold" stocks)
export function processStockEvent(
	input: StagingTradeEventStock,
): TradeEventStockAcquired | TradeEventStockSold {
	const identifier = FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier);
	if (input instanceof StagingTradeEventStockAcquired) {
		return new TradeEventStockAcquired({
			id: input.id,
			financialIdentifier: identifier,
			assetClass: input.assetClass,
			date: input.date,
			multiplier: input.multiplier,
			exchangedMoney: input.exchangedMoney,
			acquiredReason: input.acquiredReason,
			provenance: [],
		});
	}
	return new TradeEventStockSold({
		id: input.id,
		financialIdentifier: identifier,
		assetClass: input.assetClass,
		date: input.date,
		multiplier: input.multiplier,
		exchangedMoney: input.exchangedMoney,
		provenance: [],
	});
}
