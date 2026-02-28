import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import type { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";
import type { StagingTradeEventStock } from "@brrr/Core/Schemas/Staging/Events.ts";

export function processStockEvent(
	input: StagingTradeEventStock,
): TradeEventStockAcquired | TradeEventStockSold {
	const identifier = FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier);
	if (input.kind === "StagingStockAcquired") {
		return {
			kind: "StockAcquired",
			id: input.id,
			financialIdentifier: identifier,
			assetClass: input.assetClass,
			date: input.date,
			multiplier: input.multiplier,
			exchangedMoney: input.exchangedMoney,
			acquiredReason: input.acquiredReason,
			provenance: [],
		};
	}
	return {
		kind: "StockSold",
		id: input.id,
		financialIdentifier: identifier,
		assetClass: input.assetClass,
		date: input.date,
		multiplier: input.multiplier,
		exchangedMoney: input.exchangedMoney,
		provenance: [],
	};
}
