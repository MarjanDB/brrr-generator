import type { PanelEntry } from "~/download/panel/PanelEntry";

export type PanelUnderlyingArgs = {
	symbol: string;
	contracts: PanelEntry[];
};

export class PanelUnderlying {
	public readonly symbol: string;
	public readonly contracts: PanelEntry[];

	public constructor(args: PanelUnderlyingArgs) {
		this.symbol = args.symbol;
		this.contracts = args.contracts;
	}
}
