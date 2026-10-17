import type { Lot } from "@brrr/Core/LotMatching/Lot";
import type { Trade } from "@brrr/Core/LotMatching/Trade";

export interface LotMatchingMethod {
	performMatching(trades: Trade[]): Lot[];
}
