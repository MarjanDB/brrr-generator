import type { ExchangedMoney } from "@brrr/Core/Models/Events/ExchangedMoney";
import type { TradeEventId } from "@brrr/Core/Models/Identifiers";
import type { AssetClass } from "@brrr/Core/Models/Instrument/AssetClass";
import type { AnyProvenanceStep } from "@brrr/Core/Models/Provenance/AnyProvenanceStep";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export type TradeEventArgs = {
	id: TradeEventId;
	assetClass: AssetClass;
	date: ValidDateTime;
	multiplier: number;
	exchangedMoney: ExchangedMoney;
	provenance: AnyProvenanceStep[];
};

export abstract class TradeEventBase {
	public readonly id: TradeEventId;
	public readonly assetClass: AssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: ExchangedMoney;
	public readonly provenance: AnyProvenanceStep[];

	public constructor(args: TradeEventArgs) {
		this.id = args.id;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
	}
}
