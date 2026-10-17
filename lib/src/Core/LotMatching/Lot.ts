import type { Trade } from "@brrr/Core/LotMatching/Trade";

type LotSide = {
	relation: Trade;
};

export type Lot = {
	quantity: number;
	acquired: LotSide;
	sold: LotSide;
};
