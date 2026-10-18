import type { TradeEventCashTransaction } from "@brrr/Core/Schemas/Events/CashTransaction/TradeEventCashTransaction";
import type { TradeEventDerivative } from "@brrr/Core/Schemas/Events/Derivative/TradeEventDerivative";
import type { TradeEventStock } from "@brrr/Core/Schemas/Events/Stock/TradeEventStock";

export type TradeEvent = TradeEventStock | TradeEventDerivative | TradeEventCashTransaction;
