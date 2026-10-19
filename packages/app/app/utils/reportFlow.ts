import { type ReportFlowCounts, type ReportProgress, ReportStep } from "~/types/reportFlow";

// The flow's steps in the order they're taken.
export const reportSteps: ReportStep[] = [
	ReportStep.UPLOAD,
	ReportStep.REVIEW,
	ReportStep.CONFIGURE,
	ReportStep.DOWNLOAD,
];

// The last step the flow can show: each step needs what the steps before it made.
export function furthestStepOf(progress: ReportProgress): ReportStep {
	if (progress.hasImport && progress.reviewConfirmed && progress.hasAuthority) {
		return ReportStep.DOWNLOAD;
	}
	if (progress.hasImport && progress.reviewConfirmed) {
		return ReportStep.CONFIGURE;
	}
	if (progress.hasImport) {
		return ReportStep.REVIEW;
	}
	return ReportStep.UPLOAD;
}

// The step a page shows when asked for a step: itself, or the first step that's still missing.
export function stepToShow(requested: ReportStep, furthest: ReportStep): ReportStep {
	return reportSteps.indexOf(requested) <= reportSteps.indexOf(furthest) ? requested : furthest;
}

// The step a flow page's path names, by its last segment; null for any other path.
export function reportStepOfPath(path: string): ReportStep | null {
	const segment = path.split("/").at(-1);
	return reportSteps.find((step) => step === segment) ?? null;
}

// The key a step page is kept under, so going back finds it as it was left. A page starts afresh
// once what it shows is gone: upload when the flow starts over, every later step with a new
// import. The download step follows a change of tax authority itself, keeping its year.
export function reportPageKey(step: ReportStep, counts: ReportFlowCounts): string {
	switch (step) {
		case ReportStep.UPLOAD:
			return `${step}:${counts.starts}`;
		case ReportStep.REVIEW:
		case ReportStep.CONFIGURE:
		case ReportStep.DOWNLOAD:
			return `${step}:${counts.starts}:${counts.imports}`;
	}
}
