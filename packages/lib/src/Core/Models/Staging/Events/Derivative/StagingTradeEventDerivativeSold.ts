import type { OptionContract } from "@brrr/Core/Models/Instrument/OptionContract";
import {
	type StagingTradeEventArgs,
	StagingTradeEventBase,
} from "@brrr/Core/Models/Staging/Events/StagingTradeEventBase";

type StagingDerivativeSoldArgs = StagingTradeEventArgs & {
	contract: OptionContract;
};

export class StagingTradeEventDerivativeSold extends StagingTradeEventBase {
	public readonly contract: OptionContract;

	public constructor(args: StagingDerivativeSoldArgs) {
		super(args);
		this.contract = args.contract;
	}
}
