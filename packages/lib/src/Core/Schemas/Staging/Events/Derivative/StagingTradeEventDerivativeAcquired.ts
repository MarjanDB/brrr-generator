import type { AcquisitionMethod } from "@brrr/Core/Schemas/Events/AcquisitionMethod";
import {
	type StagingTradeEventArgs,
	StagingTradeEventBase,
} from "@brrr/Core/Schemas/Staging/Events/StagingTradeEventBase";

type StagingDerivativeAcquiredArgs = StagingTradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
};

export class StagingTradeEventDerivativeAcquired extends StagingTradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	constructor(args: StagingDerivativeAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}
