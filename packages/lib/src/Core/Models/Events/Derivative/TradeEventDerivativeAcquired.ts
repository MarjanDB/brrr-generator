import type { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import { type TradeEventArgs, TradeEventBase } from "@brrr/Core/Models/Events/TradeEventBase";

type DerivativeAcquiredArgs = TradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
};

export class TradeEventDerivativeAcquired extends TradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	public constructor(args: DerivativeAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}
