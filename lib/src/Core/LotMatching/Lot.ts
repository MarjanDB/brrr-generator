import type { Trade } from "@brrr/Core/LotMatching/Trade";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

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
