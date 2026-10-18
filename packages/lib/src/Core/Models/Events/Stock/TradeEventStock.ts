import type { TradeEventStockAcquired } from "@brrr/Core/Models/Events/Stock/TradeEventStockAcquired";
import type { TradeEventStockSold } from "@brrr/Core/Models/Events/Stock/TradeEventStockSold";

export type TradeEventStock = TradeEventStockAcquired | TradeEventStockSold;
