import type { ExchangedMoney } from "@brrr/Core/Schemas/Events/ExchangedMoney";
import type { TradeEventId } from "@brrr/Core/Schemas/Identifiers";
import type { AssetClass } from "@brrr/Core/Schemas/Instrument/AssetClass";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance/AnyProvenanceStep";
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

	constructor(args: TradeEventArgs) {
		this.id = args.id;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
	}
}
