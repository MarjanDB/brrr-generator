import type { StagingTradeEventDerivativeAcquired } from "@brrr/Core/Models/Staging/Events/Derivative/StagingTradeEventDerivativeAcquired";
import type { StagingTradeEventDerivativeSold } from "@brrr/Core/Models/Staging/Events/Derivative/StagingTradeEventDerivativeSold";

export type StagingTradeEventDerivative =
	| StagingTradeEventDerivativeAcquired
	| StagingTradeEventDerivativeSold;
