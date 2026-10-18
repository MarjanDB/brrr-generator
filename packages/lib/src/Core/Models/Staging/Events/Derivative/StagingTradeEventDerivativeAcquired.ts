import type { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import {
	type StagingTradeEventArgs,
	StagingTradeEventBase,
} from "@brrr/Core/Models/Staging/Events/StagingTradeEventBase";

type StagingDerivativeAcquiredArgs = StagingTradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
};

export class StagingTradeEventDerivativeAcquired extends StagingTradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	public constructor(args: StagingDerivativeAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}
