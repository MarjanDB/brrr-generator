import type { ReportInstrument } from "@brrr/lib";
import type { PanelEntry } from "~/download/panel/PanelEntry";
import type { PanelSections } from "~/download/panel/PanelSections";

// The panel's entry for an instrument, wherever it sits in the sections.
export function findEntry(
	sections: PanelSections,
	instrument: ReportInstrument,
): PanelEntry | null {
	const entries = [
		...sections.stocks,
		...sections.underlyings.flatMap((underlying) => underlying.contracts),
		...sections.payers,
		...sections.withoutLines,
	];
	return entries.find((entry) => entry.instrument === instrument) ?? null;
}
