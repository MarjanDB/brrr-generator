import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import type { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";

// The labels of the broker rows in `imported` that no report carries any further: walking down from
// the row reaches neither a report line nor a drop, in any of the reports' layers.
export function rowsGoingNowhere(imported: ProvenanceGraph, reports: ProvenanceGraph[]): string[] {
	const walkers = reports.map((report) => new ProvenanceWalker(report));
	return imported
		.nodes()
		.filter((node) => node.kind === ProvenanceNodeKind.ROW)
		.filter(
			(row) =>
				!walkers.some((walker) => {
					const slice = walker.down(row);
					return (
						slice.drops.length > 0 ||
						slice.nodes.some((node) => node.kind === ProvenanceNodeKind.REPORT_LINE)
					);
				}),
		)
		.map((row) => row.label);
}

// The labels of the report lines that no broker row leads to: walking up from the line reaches no row.
export function linesFromNowhere(reports: ProvenanceGraph[]): string[] {
	return reports.flatMap((report) => {
		const walker = new ProvenanceWalker(report);
		return report
			.nodes()
			.filter((node) => node.kind === ProvenanceNodeKind.REPORT_LINE)
			.filter((line) => !walker.up(line).nodes.some((node) => node.kind === ProvenanceNodeKind.ROW))
			.map((line) => line.label);
	});
}
