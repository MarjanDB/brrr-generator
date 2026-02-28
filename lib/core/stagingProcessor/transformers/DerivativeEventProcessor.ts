import { FinancialIdentifier } from "@brrr/core/schemas/FinancialIdentifier.ts";
import type { TradeEventDerivativeAcquired, TradeEventDerivativeSold } from "@brrr/core/schemas/Events.ts";
import type { StagingTradeEventDerivative } from "@brrr/core/schemas/staging/Events.ts";

export function processDerivativeEvent(
	input: StagingTradeEventDerivative,
): TradeEventDerivativeAcquired | TradeEventDerivativeSold {
	const identifier = FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier);
	if (input.kind === "StagingDerivativeAcquired") {
		return {
			kind: "DerivativeAcquired",
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
		kind: "DerivativeSold",
		id: input.id,
		financialIdentifier: identifier,
		assetClass: input.assetClass,
		date: input.date,
		multiplier: input.multiplier,
		exchangedMoney: input.exchangedMoney,
		provenance: [],
	};
}
