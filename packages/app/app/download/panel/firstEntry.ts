import type { PanelEntry } from "~/download/panel/PanelEntry";
import type { PanelSections } from "~/download/panel/PanelSections";

// The entry the step opens on: shares, then contracts, then payers, then instruments without lines.
export function firstEntry(sections: PanelSections): PanelEntry | null {
	return (
		sections.shares[0] ??
		sections.underlyings[0]?.contracts[0] ??
		sections.payers[0] ??
		sections.withoutLines[0] ??
		null
	);
}
