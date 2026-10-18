import type { AcquisitionMethod } from "@brrr/Core/Schemas/Events/AcquisitionMethod";
import { type TradeEventArgs, TradeEventBase } from "@brrr/Core/Schemas/Events/TradeEventBase";

type DerivativeAcquiredArgs = TradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
};

export class TradeEventDerivativeAcquired extends TradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	constructor(args: DerivativeAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}
