import type { PanelEntry } from "~/download/panel/PanelEntry";
import type { PanelUnderlying } from "~/download/panel/PanelUnderlying";

export type PanelSectionsArgs = {
	stocks: PanelEntry[];
	underlyings: PanelUnderlying[];
	payers: PanelEntry[];
	withoutLines: PanelEntry[];
};

export class PanelSections {
	public readonly stocks: PanelEntry[];
	public readonly underlyings: PanelUnderlying[];
	public readonly payers: PanelEntry[];
	// Every kind, in the reader's order.
	public readonly withoutLines: PanelEntry[];

	public constructor(args: PanelSectionsArgs) {
		this.stocks = args.stocks;
		this.underlyings = args.underlyings;
		this.payers = args.payers;
		this.withoutLines = args.withoutLines;
	}
}
