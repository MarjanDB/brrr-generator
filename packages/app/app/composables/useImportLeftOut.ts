import {
	DropReason,
	type ProvenanceDetail,
	ProvenanceDetailValue,
	type ProvenanceDrop,
	type ProvenanceGraph,
	ProvenanceNodeKind,
	ProvenanceReportReader,
} from "@brrr/lib";
import type { ComputedRef } from "vue";
import type { ImportLeftOut, ImportLeftOutLine } from "~/types/importSources";

function sameDetail(a: ProvenanceDetail | null, b: ProvenanceDetail | null): boolean {
	if (a === null || b === null) {
		return a === b;
	}
	if (a.kind !== b.kind) {
		return false;
	}
	return Object.values(ProvenanceDetailValue).every((name) => a.values[name] === b.values[name]);
}

function sameSentence(a: ProvenanceDrop, b: ProvenanceDrop): boolean {
	return a.reason === b.reason && sameDetail(a.detail, b.detail);
}

// What the import left out, one line per sentence, and what it counted once. Read from the
// import's graph only, so a report made from it changes nothing here. The rows behind each line
// come from the import sources an ancestor provided, read from the same graph.
export function useImportLeftOut(graph: () => ProvenanceGraph): ComputedRef<ImportLeftOut> {
	const sources = useImportSources();
	return computed(() => {
		const reading = new ProvenanceReportReader().read(graph());
		const lines: ImportLeftOutLine[] = [];
		for (const leftOut of reading.needsALook) {
			const drop = leftOut.drop;
			let line = lines.find((candidate) => sameSentence(candidate.drop, drop));
			if (line === undefined) {
				line = { drop, rows: [], files: [] };
				lines.push(line);
			}
			if (drop.node.kind === ProvenanceNodeKind.FILE) {
				if (!line.files.includes(drop.node.label)) {
					line.files.push(drop.node.label);
				}
				continue;
			}
			for (const row of sources.behind(drop.node)) {
				if (!line.rows.some((existing) => existing.row === row.row)) {
					line.rows.push(row);
				}
			}
		}

		const reasons = Object.values(DropReason);
		return {
			lines: [...lines].sort(
				(a, b) => reasons.indexOf(a.drop.reason) - reasons.indexOf(b.drop.reason),
			),
			needsALook: reading.totals.needsALook,
			merged: sources.merged.value,
		};
	});
}
