import type { TradeEventCashTransaction } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransaction";
import type { TradeEventDerivative } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivative";
import type { TradeEventStock } from "@brrr/Core/Models/Events/Stock/TradeEventStock";

export type TradeEvent = TradeEventStock | TradeEventDerivative | TradeEventCashTransaction;
