import type { AcquisitionMethod } from "@brrr/Core/Schemas/Events/AcquisitionMethod";
import {
	type StagingTradeEventArgs,
	StagingTradeEventBase,
} from "@brrr/Core/Schemas/Staging/Events/StagingTradeEventBase";

type StagingStockAcquiredArgs = StagingTradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
};

export class StagingTradeEventStockAcquired extends StagingTradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	constructor(args: StagingStockAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}
