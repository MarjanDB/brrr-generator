import {
	type ImportResult,
	type PredefinedInfoProvider,
	type ReportPipeline,
	type TaxAuthorityId,
	TaxAuthorityLotMatchingMethod,
	zDateTimeFromISOString,
} from "@brrr/lib";
import type { InjectionKey, Ref, ShallowRef } from "vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { DefinedPayer } from "~/types/reportFlow";
import type { TaxpayerDetails, TaxYearReport } from "~/types/taxYearReports";

type TaxYearReportsArgs = {
	pipeline: Pick<ReportPipeline, "generate">;
	// The lookups the pipeline was built with, which take the payers defined by hand.
	info: Pick<PredefinedInfoProvider, "defineCompany" | "removeCompany">;
	imported: () => ImportResult;
	authorityId: () => TaxAuthorityId;
	year: () => number;
	// The payers defined by hand this session, by ISIN.
	payers: () => ReadonlyMap<string, DefinedPayer>;
};

export type TaxYearReports = {
	// Each of the authority's forms with what it made for the year, in its tabs' order; empty until
	// they are first made. While they are made again, the last ones stay.
	reports: Readonly<ShallowRef<TaxYearReport[]>>;
	pending: Readonly<Ref<boolean>>;
	error: Readonly<Ref<string | null>>;
	// What the taxpayer last gave for an XML download, kept while the step lives so the next
	// download asks with it filled in. Never stored.
	taxpayer: Ref<TaxpayerDetails>;
	// A form's XML, written again with the taxpayer's details.
	xmlWith(outputs: GeneratedOutputs, details: TaxpayerDetails): Promise<string>;
	// The same, saved as the form's XML file.
	downloadXml(outputs: GeneratedOutputs, details: TaxpayerDetails): Promise<void>;
};

const taxYearReportsKey: InjectionKey<TaxYearReports> = Symbol("TaxYearReports");

function reportConfigOf(year: number, lotMatchingMethod: TaxAuthorityLotMatchingMethod) {
	return {
		fromDate: zDateTimeFromISOString.parse(`${year}-01-01`),
		toDate: zDateTimeFromISOString.parse(`${year + 1}-01-01`),
		lotMatchingMethod,
	};
}

// What the forms are first made with. A form's lines, CSV and provenance don't depend on the
// taxpayer, only its XML does, and that is written again on download.
const nobody: TaxpayerDetails = {
	taxNumber: "",
	name: "",
	address: "",
	city: "",
	postNumber: "",
	postName: "",
	countryId: "SI",
};

// Every form a tax authority makes for a year, made from the import whenever the import, the
// authority, the year or the payers defined by hand change, all at once so moving between them
// waits for nothing, and handed to everything below the step. Only FIFO lot matching is supported.
export function provideTaxYearReports(args: TaxYearReportsArgs): TaxYearReports {
	const reports = shallowRef<TaxYearReport[]>([]);
	const pending = ref(true);
	const error = ref<string | null>(null);
	const taxpayer = ref<TaxpayerDetails>({ ...nobody });
	// Each change starts a run; one that a later run overtook drops what it made.
	let runs = 0;
	// The ISINs whose payers the lookups were last given.
	let defined = new Set<string>();

	// The lookups take the payers as they are now: a removed one is looked up again.
	function definePayers(payers: ReadonlyMap<string, DefinedPayer>) {
		for (const isin of defined) {
			if (!payers.has(isin)) {
				args.info.removeCompany(isin);
			}
		}
		for (const payer of payers.values()) {
			args.info.defineCompany(payer.definition);
		}
		defined = new Set(payers.keys());
	}

	watch(
		[args.imported, args.authorityId, args.year, args.payers],
		async ([imported, authorityId, year, payers]) => {
			const run = ++runs;
			pending.value = true;
			error.value = null;
			definePayers(payers);
			const lotMatchingMethod = TaxAuthorityLotMatchingMethod.FIFO;
			try {
				const made = await Promise.all(
					taxAuthorityFormsOf(authorityId).map(async (form): Promise<TaxYearReport> => {
						const { csv, provenance } = await args.pipeline.generate(imported, {
							authorityId,
							reportTypeId: form.reportTypeId,
							taxpayerInfo: taxpayerInfoOf(nobody),
							reportConfig: reportConfigOf(year, lotMatchingMethod),
						});
						return {
							form,
							outputs: {
								csv,
								xmlFilename: form.xmlFilename,
								csvFilename: form.csvFilename,
								authorityId,
								reportTypeId: form.reportTypeId,
								year,
								lotMatchingMethod,
								provenance,
								imported,
							},
						};
					}),
				);
				if (run === runs) {
					reports.value = made;
				}
			} catch (caught) {
				if (run === runs) {
					reports.value = [];
					error.value = caught instanceof Error ? caught.message : String(caught);
				}
			} finally {
				if (run === runs) {
					pending.value = false;
				}
			}
		},
		{ immediate: true },
	);

	async function xmlWith(outputs: GeneratedOutputs, details: TaxpayerDetails): Promise<string> {
		const { xml } = await args.pipeline.generate(outputs.imported, {
			authorityId: outputs.authorityId,
			reportTypeId: outputs.reportTypeId,
			taxpayerInfo: taxpayerInfoOf(details),
			reportConfig: reportConfigOf(outputs.year, outputs.lotMatchingMethod),
		});
		return xml;
	}

	async function downloadXml(outputs: GeneratedOutputs, details: TaxpayerDetails): Promise<void> {
		const xml = await xmlWith(outputs, details);
		const url = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = outputs.xmlFilename;
		link.click();
		URL.revokeObjectURL(url);
	}

	const taxYearReports: TaxYearReports = {
		reports,
		pending,
		error,
		taxpayer,
		xmlWith,
		downloadXml,
	};
	provide(taxYearReportsKey, taxYearReports);
	return taxYearReports;
}

// The year's reports the step provided.
export function useTaxYearReports(): TaxYearReports {
	const taxYearReports = inject(taxYearReportsKey, null);
	if (taxYearReports === null) {
		throw new Error("useTaxYearReports: no ancestor called provideTaxYearReports");
	}
	return taxYearReports;
}
