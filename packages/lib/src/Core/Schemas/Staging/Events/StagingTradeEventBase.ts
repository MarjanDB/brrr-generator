import type { ExchangedMoney } from "@brrr/Core/Schemas/Events/ExchangedMoney";
import type { TradeEventId } from "@brrr/Core/Schemas/Identifiers";
import type { AssetClass } from "@brrr/Core/Schemas/Instrument/AssetClass";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/Instrument/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export type StagingTradeEventArgs = {
	id: TradeEventId;
	financialIdentifier: StagingFinancialIdentifier;
	assetClass: AssetClass;
	date: ValidDateTime;
	multiplier: number;
	exchangedMoney: ExchangedMoney;
};

export abstract class StagingTradeEventBase {
	public readonly id: TradeEventId;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: AssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: ExchangedMoney;

	constructor(args: StagingTradeEventArgs) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
	}
}
