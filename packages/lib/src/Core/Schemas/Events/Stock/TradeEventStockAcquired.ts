import type { AcquisitionMethod } from "@brrr/Core/Schemas/Events/AcquisitionMethod";
import { type TradeEventArgs, TradeEventBase } from "@brrr/Core/Schemas/Events/TradeEventBase";

type StockAcquiredArgs = TradeEventArgs & { acquisitionMethod: AcquisitionMethod };

export class TradeEventStockAcquired extends TradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	public constructor(args: StockAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}
