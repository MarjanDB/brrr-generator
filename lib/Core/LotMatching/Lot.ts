import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import type { Trade } from "@brrr/Core/LotMatching/Trade.ts";

export type LotAcquired = {
	date: ValidDateTime;
	relation: Trade;
};

export type LotSold = {
	date: ValidDateTime;
	relation: Trade;
};

export type Lot = {
	quantity: number;
	acquired: LotAcquired;
	sold: LotSold;
};
