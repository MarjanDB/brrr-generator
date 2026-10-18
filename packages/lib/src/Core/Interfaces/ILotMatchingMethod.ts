import type { Lot } from "@brrr/Core/Models/LotMatching/Lot";
import type { Trade } from "@brrr/Core/Models/LotMatching/Trade";

export interface ILotMatchingMethod {
	performMatching(trades: Trade[]): Lot[];
}
