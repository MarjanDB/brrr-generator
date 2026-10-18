import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import type { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";

// The labels of the broker rows in `imported` that no report carries any further: walking down from
// the row reaches neither a report line nor a drop, in any of the reports' layers. Membership is
// ignored: a grouping connects every item of an instrument, so walking through it would make this
// check always pass.
export function rowsGoingNowhere(imported: ProvenanceGraph, reports: ProvenanceGraph[]): string[] {
	const walkers = reports.map((report) => new ProvenanceWalker(report, [ProvenanceChange.GROUPED]));
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
// Membership is ignored, for the same reason as above.
export function linesFromNowhere(reports: ProvenanceGraph[]): string[] {
	return reports.flatMap((report) => {
		const walker = new ProvenanceWalker(report, [ProvenanceChange.GROUPED]);
		return report
			.nodes()
			.filter((node) => node.kind === ProvenanceNodeKind.REPORT_LINE)
			.filter((line) => !walker.up(line).nodes.some((node) => node.kind === ProvenanceNodeKind.ROW))
			.map((line) => line.label);
	});
}
