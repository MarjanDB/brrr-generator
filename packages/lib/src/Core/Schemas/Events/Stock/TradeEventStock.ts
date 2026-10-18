import type { TradeEventStockAcquired } from "@brrr/Core/Schemas/Events/Stock/TradeEventStockAcquired";
import type { TradeEventStockSold } from "@brrr/Core/Schemas/Events/Stock/TradeEventStockSold";

export type TradeEventStock = TradeEventStockAcquired | TradeEventStockSold;
