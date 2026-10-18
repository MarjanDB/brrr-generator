import type { TradeEventId } from "@brrr/Core/Models/Identifiers";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export type Trade = {
	id: TradeEventId;
	quantity: number;
	date: ValidDateTime;
};
