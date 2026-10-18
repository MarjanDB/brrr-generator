import type { PanelEntry } from "~/download/panel/PanelEntry";
import type { PanelUnderlying } from "~/download/panel/PanelUnderlying";

export type PanelSectionsArgs = {
	shares: PanelEntry[];
	underlyings: PanelUnderlying[];
	payers: PanelEntry[];
	withoutLines: PanelEntry[];
};

export class PanelSections {
	public readonly shares: PanelEntry[];
	public readonly underlyings: PanelUnderlying[];
	public readonly payers: PanelEntry[];
	// Every kind, in the reader's order.
	public readonly withoutLines: PanelEntry[];

	public constructor(args: PanelSectionsArgs) {
		this.shares = args.shares;
		this.underlyings = args.underlyings;
		this.payers = args.payers;
		this.withoutLines = args.withoutLines;
	}
}
