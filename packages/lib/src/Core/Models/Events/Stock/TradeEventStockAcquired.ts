import type { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import { type TradeEventArgs, TradeEventBase } from "@brrr/Core/Models/Events/TradeEventBase";

type StockAcquiredArgs = TradeEventArgs & { acquisitionMethod: AcquisitionMethod };

export class TradeEventStockAcquired extends TradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	public constructor(args: StockAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}
