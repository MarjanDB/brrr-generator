import type { Lot } from "@brrr/Core/LotMatching/Lot";
import type { Trade } from "@brrr/Core/LotMatching/Trade";

export interface LotMatchingMethod {
	performMatching(events: Trade[]): Lot[];
	generateTradesFromLotsWithTracking(lots: Lot[]): Trade[];
}
