import type { PanelEntry } from "~/download/panel/PanelEntry";
import { PanelSections } from "~/download/panel/PanelSections";
import { PanelUnderlying } from "~/download/panel/PanelUnderlying";

function matches(entry: PanelEntry, query: string): boolean {
	return [
		entry.ticker,
		entry.isin ?? "",
		entry.contract?.underlyingSymbol ?? "",
		entry.contract?.occSymbol ?? "",
	].some((text) => text.toLowerCase().includes(query));
}

// Keeps the entries that match the query in their ticker, ISIN, underlying symbol or contract
// symbol, in the same sections and order. An underlying that matches keeps all its contracts, and
// one with no contract left goes.
export function filterPanel(sections: PanelSections, rawQuery: string): PanelSections {
	const query = rawQuery.trim().toLowerCase();
	if (query === "") {
		return sections;
	}
	return new PanelSections({
		shares: sections.shares.filter((entry) => matches(entry, query)),
		underlyings: sections.underlyings
			.map((underlying) =>
				underlying.symbol.toLowerCase().includes(query)
					? underlying
					: new PanelUnderlying({
							symbol: underlying.symbol,
							contracts: underlying.contracts.filter((entry) => matches(entry, query)),
						}),
			)
			.filter((underlying) => underlying.contracts.length > 0),
		payers: sections.payers.filter((entry) => matches(entry, query)),
		withoutLines: sections.withoutLines.filter((entry) => matches(entry, query)),
	});
}
