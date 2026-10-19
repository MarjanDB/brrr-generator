import type { ImportResult } from "@brrr/lib";
import type { ComputedRef, InjectionKey, Ref, ShallowRef } from "vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { ReportStep } from "~/types/reportFlow";

// What the report flow carries from page to page: the import, whether its review was confirmed,
// and the report generated from it. It lives as long as the flow's parent page; leaving the flow
// or reloading drops it.
export type ReportFlow = {
	imported: Readonly<ShallowRef<ImportResult | null>>;
	reviewConfirmed: Readonly<Ref<boolean>>;
	report: Readonly<ShallowRef<GeneratedOutputs | null>>;
	// The last step the flow can show with what it holds.
	furthestStep: ComputedRef<ReportStep>;
	// How many times the flow started over and how many imports and reports it took, so a page
	// that shows one can start afresh for the next.
	startCount: Readonly<Ref<number>>;
	importCount: Readonly<Ref<number>>;
	reportCount: Readonly<Ref<number>>;
	// A new upload: everything after it goes.
	acceptImport(imported: ImportResult): void;
	confirmReview(): void;
	// A new report replaces the last one.
	acceptReport(report: GeneratedOutputs): void;
	startOver(): void;
};

const reportFlowKey: InjectionKey<ReportFlow> = Symbol("ReportFlow");

// Creates the report flow's state and hands it to every step page below.
export function provideReportFlow(): ReportFlow {
	const imported = shallowRef<ImportResult | null>(null);
	const reviewConfirmed = ref(false);
	const report = shallowRef<GeneratedOutputs | null>(null);
	const startCount = ref(0);
	const importCount = ref(0);
	const reportCount = ref(0);

	const furthestStep = computed(() =>
		furthestStepOf({
			hasImport: imported.value !== null,
			reviewConfirmed: reviewConfirmed.value,
			hasReport: report.value !== null,
		}),
	);

	const flow: ReportFlow = {
		imported,
		reviewConfirmed,
		report,
		furthestStep,
		startCount,
		importCount,
		reportCount,
		acceptImport(next) {
			imported.value = next;
			reviewConfirmed.value = false;
			report.value = null;
			importCount.value++;
		},
		confirmReview() {
			reviewConfirmed.value = true;
		},
		acceptReport(next) {
			report.value = next;
			reportCount.value++;
		},
		startOver() {
			imported.value = null;
			reviewConfirmed.value = false;
			report.value = null;
			startCount.value++;
		},
	};
	provide(reportFlowKey, flow);
	return flow;
}

// The report flow a parent page provided.
export function useReportFlow(): ReportFlow {
	const flow = inject(reportFlowKey, null);
	if (flow === null) {
		throw new Error("useReportFlow: no ancestor called provideReportFlow");
	}
	return flow;
}
