import type { ProvenanceDetailKind, ProvenanceNode, ProvenanceWarning } from "@brrr/lib";
import type { PanelEntry } from "~/types/instrumentPanel";
import type { DefinedPayer } from "~/types/reportFlow";

// What the report's left column lists: its instruments, or its problems.
export enum ReportPanelTab {
	INSTRUMENTS = "INSTRUMENTS",
	PROBLEMS = "PROBLEMS",
}

// Whether a problem still needs the report's maker, or a fix made this session took care of it.
export enum ProblemState {
	OPEN = "OPEN",
	RESOLVED = "RESOLVED",
}

// One problem of the report about one of its instruments: its warnings of one kind, the items on
// the form they affect, and the payer defined by hand that resolved it, when one did.
export type InstrumentProblem = {
	// The same in a report made again, whose nodes are new.
	key: string;
	kind: ProvenanceDetailKind;
	entry: PanelEntry;
	// Its ticker, or a contract's OCC symbol.
	title: string;
	// The report's own; none once a definition took.
	warnings: ProvenanceWarning[];
	// The instrument's items on the lines the warnings are on, or, without warnings, on any line.
	affected: ProvenanceNode[];
	// How many lines of the form it is about.
	lineCount: number;
	defined: DefinedPayer | null;
	state: ProblemState;
};

// The report's problems of one kind, in the problems view's list.
export type ProblemGroup = {
	kind: ProvenanceDetailKind;
	problems: InstrumentProblem[];
};
