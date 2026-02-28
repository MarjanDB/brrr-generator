import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { TradeEventDerivativeAcquired, TradeEventDerivativeSold } from "@brrr/Core/Schemas/Events.ts";
import { StagingTradeEventDerivativeAcquired, type StagingTradeEventDerivative } from "@brrr/Core/Schemas/Staging/Events.ts";

export function processDerivativeEvent(
	input: StagingTradeEventDerivative,
): TradeEventDerivativeAcquired | TradeEventDerivativeSold {
	const identifier = FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier);
	if (input instanceof StagingTradeEventDerivativeAcquired) {
		return new TradeEventDerivativeAcquired({
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
	return new TradeEventDerivativeSold({
		id: input.id,
		financialIdentifier: identifier,
		assetClass: input.assetClass,
		date: input.date,
		multiplier: input.multiplier,
		exchangedMoney: input.exchangedMoney,
		provenance: [],
	});
}
