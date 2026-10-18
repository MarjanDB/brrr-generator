import {
	DropReason,
	type ProvenanceDetail,
	ProvenanceDetailValue,
	type ProvenanceDrop,
	ProvenanceNodeKind,
	type ReportProvenance,
} from "@brrr/lib";
import { ImportLeftOut } from "~/review/ImportLeftOut";
import { ImportLeftOutLine } from "~/review/ImportLeftOutLine";
import type { ImportSources } from "~/review/ImportSources";
import type { RowSource } from "~/review/RowSource";

type LineDraft = {
	drop: ProvenanceDrop;
	rows: RowSource[];
	files: string[];
};

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
// import's graph only, so a report made from it changes nothing here.
export function readImportLeftOut(
	reading: ReportProvenance,
	sources: ImportSources,
): ImportLeftOut {
	const drafts: LineDraft[] = [];
	for (const leftOut of reading.needsALook) {
		const drop = leftOut.drop;
		let draft = drafts.find((candidate) => sameSentence(candidate.drop, drop));
		if (draft === undefined) {
			draft = { drop, rows: [], files: [] };
			drafts.push(draft);
		}
		if (drop.node.kind === ProvenanceNodeKind.FILE) {
			if (!draft.files.includes(drop.node.label)) {
				draft.files.push(drop.node.label);
			}
			continue;
		}
		for (const row of sources.behind(drop.node)) {
			if (!draft.rows.some((existing) => existing.row === row.row)) {
				draft.rows.push(row);
			}
		}
	}

	const reasons = Object.values(DropReason);
	const ordered = [...drafts].sort(
		(a, b) => reasons.indexOf(a.drop.reason) - reasons.indexOf(b.drop.reason),
	);
	return new ImportLeftOut({
		lines: ordered.map(
			(draft) => new ImportLeftOutLine({ drop: draft.drop, rows: draft.rows, files: draft.files }),
		),
		needsALook: reading.totals.needsALook,
		merged: sources.merged(),
	});
}
