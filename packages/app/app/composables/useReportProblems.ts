import {
	ProvenanceDetailKind,
	type ProvenanceNode,
	type ProvenanceWalker,
	type ReportInstrument,
	type ReportProvenance,
} from "@brrr/lib";
import type { ComputedRef, InjectionKey, Ref } from "vue";
import type { LeftOutGroup, PanelSections } from "~/types/instrumentPanel";
import type { DefinedPayer } from "~/types/reportFlow";
import {
	type InstrumentProblem,
	type ProblemGroup,
	ProblemState,
	ReportPanelTab,
} from "~/types/reportProblems";
import { ReportInstruments } from "~/utils/reportInstruments";

type ReportProblemsArgs = {
	sections: () => PanelSections;
	reading: () => ReportProvenance;
	walker: () => ProvenanceWalker;
	// The form's own name, which the sentences name.
	formCode: () => string;
	// The payers defined by hand this session, by ISIN.
	payers: () => ReadonlyMap<string, DefinedPayer>;
	// Opens an instrument on the instruments tab, its focus on an item of it.
	show: (instrument: ReportInstrument, at: ProvenanceNode) => void;
};

// What every part of a form's report reads about its problems: the problems view's list and its
// selection, the left column's tab, and what a problem says, where its signs are shown.
export type ReportProblems = {
	groups: ComputedRef<ProblemGroup[]>;
	// What the report step left out that needs a look, by reason. Nothing fixes it, so it is listed
	// after the problems.
	leftOut: ComputedRef<LeftOutGroup[]>;
	// The problems still open, and each reason something was left out: the Problems tab's count.
	openCount: ComputedRef<number>;
	// Whether there is anything to list, open or resolved; without it there is no Problems tab.
	hasProblems: ComputedRef<boolean>;
	tab: Ref<ReportPanelTab>;
	// What the view shows: the one picked, by its key, while the report has it; else the first
	// problem still open, else what was left out, else the first problem.
	selected: ComputedRef<InstrumentProblem | null>;
	selectedLeftOut: ComputedRef<LeftOutGroup | null>;
	select: (key: string) => void;
	// Opens the Problems tab on a problem, or, without a key, on the first one still open.
	review: (key: string | null) => void;
	// The problem about an instrument, open or resolved.
	problemOf: (instrument: ReportInstrument) => InstrumentProblem | null;
	// The open problem an item on the form is affected by.
	openProblemAt: (node: ProvenanceNode) => InstrumentProblem | null;
	// Opens the problem's instrument on the instruments tab, its focus on an item it affects.
	showOnForm: (problem: InstrumentProblem, at: ProvenanceNode) => void;
	titleOf: (problem: InstrumentProblem) => string;
	sentenceOf: (problem: InstrumentProblem) => string;
	// The few words a sign shows where the instrument is listed.
	signOf: (problem: InstrumentProblem) => string;
};

const reportProblemsKey: InjectionKey<ReportProblems> = Symbol("ReportProblems");

// Creates a form's problems view and hands it to every part of the report.
export function provideReportProblems(args: ReportProblemsArgs): ReportProblems {
	const { t } = useI18n();
	const { warningSentence } = useProvenanceText();
	const tab = ref(ReportPanelTab.INSTRUMENTS);
	const picked = ref<string | null>(null);

	const groups = computed(() =>
		problemGroupsOf(args.sections(), args.reading().warnings, args.payers(), args.walker()),
	);
	const problems = computed(() => groups.value.flatMap((group) => group.problems));
	const leftOut = computed(() => ReportInstruments.leftOutGroupsOf(args.reading().needsALook));
	const current = computed(() => {
		const key = picked.value;
		const known =
			problems.value.some((problem) => problem.key === key) ||
			leftOut.value.some((_, index) => leftOutKey(index) === key);
		if (key !== null && known) {
			return key;
		}
		const open = problems.value.find((problem) => problem.state === ProblemState.OPEN);
		return (
			open?.key ??
			(leftOut.value.length > 0 ? leftOutKey(0) : null) ??
			problems.value[0]?.key ??
			null
		);
	});

	function titleOf(problem: InstrumentProblem): string {
		return definesPayer(problem.kind) && problem.entry.isin !== null
			? t("problems_payer_title", { isin: problem.entry.isin })
			: problem.title;
	}

	function sentenceOf(problem: InstrumentProblem): string {
		const form = args.formCode();
		if (problem.defined !== null) {
			return t("problems_payer_resolved", { form, name: problem.defined.definition.name });
		}
		const isin = problem.entry.isin ?? "";
		if (problem.kind === ProvenanceDetailKind.COMPANY_NOT_FOUND) {
			return t("problems_payer_not_found", { isin, form });
		}
		if (problem.kind === ProvenanceDetailKind.COMPANY_LOOKUP_FAILED) {
			return t("problems_payer_lookup_failed", { isin, form });
		}
		const [first] = problem.warnings;
		return first === undefined ? "" : warningSentence(first);
	}

	function signOf(problem: InstrumentProblem): string {
		if (problem.defined !== null) {
			return t("problems_sign_defined", { name: problem.defined.definition.name });
		}
		if (problem.kind === ProvenanceDetailKind.COMPANY_NOT_FOUND) {
			return t("problems_sign_company_not_found");
		}
		if (problem.kind === ProvenanceDetailKind.COMPANY_LOOKUP_FAILED) {
			return t("problems_sign_company_lookup_failed");
		}
		return t(warningGroupKeys[problem.kind]);
	}

	const view: ReportProblems = {
		groups,
		leftOut,
		openCount: computed(() => openProblemCount(groups.value) + leftOut.value.length),
		hasProblems: computed(() => problems.value.length > 0 || leftOut.value.length > 0),
		tab,
		selected: computed(
			() => problems.value.find((problem) => problem.key === current.value) ?? null,
		),
		selectedLeftOut: computed(
			() => leftOut.value.find((_, index) => leftOutKey(index) === current.value) ?? null,
		),
		select: (key) => {
			picked.value = key;
		},
		review: (key) => {
			picked.value = key;
			tab.value = ReportPanelTab.PROBLEMS;
		},
		problemOf: (instrument) =>
			problems.value.find((problem) => problem.entry.instrument === instrument) ?? null,
		openProblemAt: (node) =>
			problems.value.find(
				(problem) => problem.state === ProblemState.OPEN && problem.affected.includes(node),
			) ?? null,
		showOnForm: (problem, at) => {
			tab.value = ReportPanelTab.INSTRUMENTS;
			args.show(problem.entry.instrument, at);
		},
		titleOf,
		sentenceOf,
		signOf,
	};
	provide(reportProblemsKey, view);
	return view;
}

// The problems view a form's report provided.
export function useReportProblems(): ReportProblems {
	const problems = inject(reportProblemsKey, null);
	if (problems === null) {
		throw new Error("useReportProblems: no ancestor called provideReportProblems");
	}
	return problems;
}
