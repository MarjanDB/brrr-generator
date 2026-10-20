import type { ImportResult, TaxAuthorityId } from "@brrr/lib";
import type { ComputedRef, InjectionKey, Ref, ShallowRef } from "vue";
import type { DefinedPayer, ReportStep } from "~/types/reportFlow";

// What the report flow carries from page to page: the import, whether its review was confirmed,
// the tax authority to make reports for, and the payers defined by hand. The download step makes
// the reports from these. It lives as long as the flow's parent page; leaving the flow or
// reloading drops it.
export type ReportFlow = {
	imported: Readonly<ShallowRef<ImportResult | null>>;
	reviewConfirmed: Readonly<Ref<boolean>>;
	authority: Readonly<Ref<TaxAuthorityId | null>>;
	// By ISIN. Only starting over drops them: a payer defined for one import is the same company in
	// the next.
	payers: Readonly<ShallowRef<ReadonlyMap<string, DefinedPayer>>>;
	// The last step the flow can show with what it holds.
	furthestStep: ComputedRef<ReportStep>;
	// How many times the flow started over and how many imports it took, so a page that shows one
	// can start afresh for the next.
	startCount: Readonly<Ref<number>>;
	importCount: Readonly<Ref<number>>;
	// A new upload: everything after it goes.
	acceptImport(imported: ImportResult): void;
	confirmReview(): void;
	chooseAuthority(authority: TaxAuthorityId): void;
	// Defines a payer, or replaces the one its ISIN had.
	definePayer(payer: DefinedPayer): void;
	removePayer(isin: string): void;
	startOver(): void;
};

const reportFlowKey: InjectionKey<ReportFlow> = Symbol("ReportFlow");

// Creates the report flow's state and hands it to every step page below.
export function provideReportFlow(): ReportFlow {
	const imported = shallowRef<ImportResult | null>(null);
	const reviewConfirmed = ref(false);
	const authority = ref<TaxAuthorityId | null>(null);
	const payers = shallowRef<ReadonlyMap<string, DefinedPayer>>(new Map());
	const startCount = ref(0);
	const importCount = ref(0);

	const furthestStep = computed(() =>
		furthestStepOf({
			hasImport: imported.value !== null,
			reviewConfirmed: reviewConfirmed.value,
			hasAuthority: authority.value !== null,
		}),
	);

	const flow: ReportFlow = {
		imported,
		reviewConfirmed,
		authority,
		payers,
		furthestStep,
		startCount,
		importCount,
		acceptImport(next) {
			imported.value = next;
			reviewConfirmed.value = false;
			authority.value = null;
			importCount.value++;
		},
		confirmReview() {
			reviewConfirmed.value = true;
		},
		chooseAuthority(next) {
			authority.value = next;
		},
		definePayer(payer) {
			payers.value = new Map(payers.value).set(payer.definition.isin, payer);
		},
		removePayer(isin) {
			const next = new Map(payers.value);
			next.delete(isin);
			payers.value = next;
		},
		startOver() {
			imported.value = null;
			reviewConfirmed.value = false;
			authority.value = null;
			payers.value = new Map();
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
