import type { StagingTradeEventDerivativeAcquired } from "@brrr/Core/Schemas/Staging/Events/Derivative/StagingTradeEventDerivativeAcquired";
import type { StagingTradeEventDerivativeSold } from "@brrr/Core/Schemas/Staging/Events/Derivative/StagingTradeEventDerivativeSold";

export type StagingTradeEventDerivative =
	| StagingTradeEventDerivativeAcquired
	| StagingTradeEventDerivativeSold;
