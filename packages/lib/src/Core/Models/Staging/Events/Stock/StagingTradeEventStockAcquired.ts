import type { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import {
	type StagingTradeEventArgs,
	StagingTradeEventBase,
} from "@brrr/Core/Models/Staging/Events/StagingTradeEventBase";

type StagingStockAcquiredArgs = StagingTradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
};

export class StagingTradeEventStockAcquired extends StagingTradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	public constructor(args: StagingStockAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}
