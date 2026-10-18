import type { Lot } from "@brrr/Core/LotMatching/Lot";
import type { Trade } from "@brrr/Core/LotMatching/Trade";

export interface ILotMatchingMethod {
	performMatching(trades: Trade[]): Lot[];
}
