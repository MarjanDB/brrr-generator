import type { OptionRight } from "@brrr/lib";

export type PanelContractArgs = {
	underlyingSymbol: string;
	expiry: string;
	strike: string;
	right: OptionRight;
	occSymbol: string;
};

// An option contract's terms, as the grouping recorded them.
export class PanelContract {
	public readonly underlyingSymbol: string;
	// yyyy-MM-dd, as recorded
	public readonly expiry: string;
	public readonly strike: string;
	public readonly right: OptionRight;
	// The grouping's TICKER: the broker's own symbol for the contract.
	public readonly occSymbol: string;

	public constructor(args: PanelContractArgs) {
		this.underlyingSymbol = args.underlyingSymbol;
		this.expiry = args.expiry;
		this.strike = args.strike;
		this.right = args.right;
		this.occSymbol = args.occSymbol;
	}
}
