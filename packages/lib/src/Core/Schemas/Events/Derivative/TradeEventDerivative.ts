import type { TradeEventDerivativeAcquired } from "@brrr/Core/Schemas/Events/Derivative/TradeEventDerivativeAcquired";
import type { TradeEventDerivativeSold } from "@brrr/Core/Schemas/Events/Derivative/TradeEventDerivativeSold";

export type TradeEventDerivative = TradeEventDerivativeAcquired | TradeEventDerivativeSold;
