import { FinancialIdentifier } from "@brrr/core/schemas/FinancialIdentifier.ts";
import type { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/core/schemas/Events.ts";
import type { StagingTradeEventStock } from "@brrr/core/schemas/staging/Events.ts";

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
