import type { StagingTradeEventStockAcquired } from "@brrr/Core/Models/Staging/Events/Stock/StagingTradeEventStockAcquired";
import type { StagingTradeEventStockSold } from "@brrr/Core/Models/Staging/Events/Stock/StagingTradeEventStockSold";

export type StagingTradeEventStock = StagingTradeEventStockAcquired | StagingTradeEventStockSold;
