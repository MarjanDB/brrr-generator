import type { LotLeg } from "@brrr/Core/Models/LotMatching/LotLeg";

export type MatchedLot<T> = {
	acquired: LotLeg<T>;
	sold: LotLeg<T>;
};
