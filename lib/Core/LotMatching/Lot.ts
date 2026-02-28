import type { DateTime } from "luxon";
import type { Trade } from "@brrr/Core/LotMatching/Trade.ts";

export type LotAcquired = {
	date: DateTime;
	relation: Trade;
};

export type LotSold = {
	date: DateTime;
	relation: Trade;
};

export type Lot = {
	quantity: number;
	acquired: LotAcquired;
	sold: LotSold;
};
