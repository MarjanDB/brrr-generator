import type { Lot } from "@brrr/Core/LotMatching/Lot.ts";
import type { Trade } from "@brrr/Core/LotMatching/Trade.ts";

export interface LotMatchingMethod {
	performMatching(events: Trade[]): Lot[];
	generateTradesFromLotsWithTracking(lots: Lot[]): Trade[];
}
