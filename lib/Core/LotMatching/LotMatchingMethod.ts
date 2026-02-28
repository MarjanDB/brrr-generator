import type { Lot } from "./Lot.ts";
import type { Trade } from "./Trade.ts";

export interface LotMatchingMethod {
	performMatching(events: Trade[]): Lot[];
	generateTradesFromLotsWithTracking(lots: Lot[]): Trade[];
}
