import type { StagingTradeEventStockAcquired } from "@brrr/Core/Schemas/Staging/Events/Stock/StagingTradeEventStockAcquired";
import type { StagingTradeEventStockSold } from "@brrr/Core/Schemas/Staging/Events/Stock/StagingTradeEventStockSold";

export type StagingTradeEventStock = StagingTradeEventStockAcquired | StagingTradeEventStockSold;
