import type { Ticker } from "@brrr/Core/Models/Identifiers";
import type { OptionRight } from "@brrr/Core/Models/Instrument/OptionRight";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type OptionContractArgs = {
	underlyingSymbol: Ticker;
	expiry: ValidDateTime;
	strike: number;
	optionRight: OptionRight;
	multiplier: number;
};

export class OptionContract {
	public readonly underlyingSymbol: Ticker;
	public readonly expiry: ValidDateTime;
	public readonly strike: number;
	public readonly optionRight: OptionRight;
	public readonly multiplier: number;

	public constructor(args: OptionContractArgs) {
		this.underlyingSymbol = args.underlyingSymbol;
		this.expiry = args.expiry;
		this.strike = args.strike;
		this.optionRight = args.optionRight;
		this.multiplier = args.multiplier;
	}
}
