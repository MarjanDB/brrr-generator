import type { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import type { OptionContract } from "@brrr/Core/Models/Instrument/OptionContract";
import {
	type StagingTradeEventArgs,
	StagingTradeEventBase,
} from "@brrr/Core/Models/Staging/Events/StagingTradeEventBase";

type StagingDerivativeAcquiredArgs = StagingTradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
	contract: OptionContract;
};

export class StagingTradeEventDerivativeAcquired extends StagingTradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;
	public readonly contract: OptionContract;

	public constructor(args: StagingDerivativeAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
		this.contract = args.contract;
	}
}
