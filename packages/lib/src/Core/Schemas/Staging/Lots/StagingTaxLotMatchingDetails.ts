import type { TradeEventId } from "@brrr/Core/Schemas/Identifiers";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export class StagingTaxLotMatchingDetails {
	public readonly id: TradeEventId | null;
	public readonly dateTime: ValidDateTime | null;

	public constructor(args: {
		id: TradeEventId | null;
		dateTime: ValidDateTime | null;
	}) {
		this.id = args.id;
		this.dateTime = args.dateTime;
	}
}
