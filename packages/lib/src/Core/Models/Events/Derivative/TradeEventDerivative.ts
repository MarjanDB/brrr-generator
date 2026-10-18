import type { TradeEventDerivativeAcquired } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivativeAcquired";
import type { TradeEventDerivativeSold } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivativeSold";

export type TradeEventDerivative = TradeEventDerivativeAcquired | TradeEventDerivativeSold;
