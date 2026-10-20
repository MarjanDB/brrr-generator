import {
	ProvenanceDetailKind,
	type ProvenanceNode,
	type ProvenanceWalker,
	type ProvenanceWarning,
} from "@brrr/lib";
import { InstrumentPanels } from "~/composables/instrumentPanel/instrumentPanels";
import { Timelines } from "~/composables/instrumentTimeline/timelines";
import type { PanelEntry, PanelSections } from "~/types/instrumentPanel";
import type { DefinedPayer } from "~/types/reportFlow";
import { type InstrumentProblem, type ProblemGroup, ProblemState } from "~/types/reportProblems";

// Whether a payer defined by hand resolves a warning of this kind: the company lookup found none,
// or failed.
export function definesPayer(kind: ProvenanceDetailKind): boolean {
	return (
		kind === ProvenanceDetailKind.COMPANY_NOT_FOUND ||
		kind === ProvenanceDetailKind.COMPANY_LOOKUP_FAILED
	);
}

// The instrument's items on any of the lines; without lines, on any line of the form.
function affectedOf(
	entry: PanelEntry,
	lines: ProvenanceNode[] | null,
	walker: ProvenanceWalker,
): ProvenanceNode[] {
	return entry.instrument.events
		.map((item) => item.node)
		.filter((node) => {
			const reached = Timelines.linesReachedBy(node, walker);
			return lines === null ? reached.length > 0 : reached.some((line) => lines.includes(line));
		});
}

// The report's problems about its instruments, grouped by kind, the groups in the order their kinds
// first come: an instrument's warnings of one kind are one problem. Only the report's own warnings
// count, not its import's. A payer defined by hand resolves its problem, and stays in that
// problem's group once the report, made again with it, no longer warns about it.
export function problemGroupsOf(
	sections: PanelSections,
	reported: ProvenanceWarning[],
	payers: ReadonlyMap<string, DefinedPayer>,
	walker: ProvenanceWalker,
): ProblemGroup[] {
	const groups = new Map<ProvenanceDetailKind, InstrumentProblem[]>();
	const add = (problem: InstrumentProblem) => {
		groups.set(problem.kind, [...(groups.get(problem.kind) ?? []), problem]);
	};
	for (const entry of InstrumentPanels.entriesOf(sections)) {
		const title = entry.contract?.occSymbol ?? entry.ticker;
		const keyOf = (kind: ProvenanceDetailKind) =>
			`${kind}:${entry.kind}:${entry.isin ?? ""}:${title}`;
		const payer = entry.isin === null ? null : (payers.get(entry.isin) ?? null);
		const warnings = entry.instrument.warnings.filter((warning) => reported.includes(warning));
		const kinds = [...new Set(warnings.map((warning) => warning.detail.kind))];
		for (const kind of kinds) {
			const own = warnings.filter((warning) => warning.detail.kind === kind);
			const defined = definesPayer(kind) ? payer : null;
			add({
				key: keyOf(kind),
				kind,
				entry,
				title,
				warnings: own,
				affected: affectedOf(
					entry,
					own.map((warning) => warning.node),
					walker,
				),
				lineCount: new Set(own.map((warning) => warning.node)).size,
				defined,
				state: defined === null ? ProblemState.OPEN : ProblemState.RESOLVED,
			});
		}
		if (payer !== null && !kinds.some(definesPayer)) {
			add({
				key: keyOf(payer.resolves),
				kind: payer.resolves,
				entry,
				title,
				warnings: [],
				affected: affectedOf(entry, null, walker),
				lineCount: entry.lineCount,
				defined: payer,
				state: ProblemState.RESOLVED,
			});
		}
	}
	return [...groups].map(([kind, problems]) => ({ kind, problems }));
}

// How many problems still need the report's maker.
export function openProblemCount(groups: ProblemGroup[]): number {
	return groups
		.flatMap((group) => group.problems)
		.filter((problem) => problem.state === ProblemState.OPEN).length;
}

// What the view calls the group of what was left out for one reason, at its place in the list.
export function leftOutKey(index: number): string {
	return `left-out:${index}`;
}
