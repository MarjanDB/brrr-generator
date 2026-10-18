import type { ProvenanceWarning } from "@brrr/lib";
import type { PanelEntry } from "~/download/panel/PanelEntry";
import type { PanelSections } from "~/download/panel/PanelSections";

export type WarningItem = {
	// The instrument the warning is about: its ticker, or a contract's OCC symbol.
	title: string;
	warning: ProvenanceWarning;
};

function itemsOf(entry: PanelEntry): WarningItem[] {
	const title = entry.contract?.occSymbol ?? entry.ticker;
	return entry.instrument.warnings.map((warning) => ({ title, warning }));
}

// Every warning in the report, each with the instrument it belongs to, in the panel's order.
export function warningItemsOf(sections: PanelSections): WarningItem[] {
	return [
		...sections.stocks,
		...sections.underlyings.flatMap((underlying) => underlying.contracts),
		...sections.payers,
		...sections.withoutLines,
	].flatMap(itemsOf);
}
