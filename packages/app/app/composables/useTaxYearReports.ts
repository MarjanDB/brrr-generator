import {
	type FinancialEvents,
	type ImportResult,
	type PredefinedInfoProvider,
	type ReportPipeline,
	SlovenianReportTypeId,
	TaxAuthorityId,
	TaxAuthorityLotMatchingMethod,
	TaxpayerConfigSchema,
	type TaxpayerInfo,
	TaxpayerType,
	zDateTimeFromISOString,
} from "@brrr/lib";
import type { DateTime } from "luxon";
import type { ComputedRef, InjectionKey, Ref, ShallowRef } from "vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { DefinedPayer } from "~/types/reportFlow";
import type { TaxAuthorityForm, TaxpayerDetails, TaxYearReport } from "~/types/taxYearReports";

type TaxYearReportsArgs = {
	pipeline: Pick<ReportPipeline, "generate">;
	// The lookups the pipeline was built with, which take the payers defined by hand.
	info: Pick<PredefinedInfoProvider, "defineCompany" | "removeCompany">;
	imported: () => ImportResult;
	authorityId: () => TaxAuthorityId;
	// The payers defined by hand this session, by ISIN.
	payers: () => ReadonlyMap<string, DefinedPayer>;
	// The day the step opens, which picks the year it opens on.
	today: DateTime;
};

export type TaxYearReports = {
	// Every form the authority makes, in the order its tabs show them.
	forms: ComputedRef<TaxAuthorityForm[]>;
	// Every year a trade or a payment in the import falls in, oldest first: the years it can make
	// reports for.
	years: ComputedRef<number[]>;
	// The year the forms are made for. It opens on last year, the one people file for, when the
	// import has anything in it; else on the latest earlier year that has something, else the
	// earliest later one; with nothing in the import, on last year.
	year: Ref<number>;
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

// Every form each tax authority makes, in the order its tabs show them.
const taxAuthorityForms: TaxAuthorityForm[] = [
	{
		authorityId: TaxAuthorityId.SLOVENIA,
		reportTypeId: SlovenianReportTypeId.KDVP,
		code: "Doh-KDVP",
		nameKey: "report_type_kdvp",
		xmlFilename: "Doh_KDVP.xml",
		csvFilename: "export-trades.csv",
		takesTaxpayer: true,
	},
	{
		authorityId: TaxAuthorityId.SLOVENIA,
		reportTypeId: SlovenianReportTypeId.DIV,
		code: "Doh-Div",
		nameKey: "report_type_div",
		xmlFilename: "Doh_Div.xml",
		csvFilename: "export-dividends.csv",
		takesTaxpayer: true,
	},
	// D-IFI's XML has no taxpayer block.
	{
		authorityId: TaxAuthorityId.SLOVENIA,
		reportTypeId: SlovenianReportTypeId.IFI,
		code: "D-IFI",
		nameKey: "report_type_ifi",
		xmlFilename: "D_Ifi.xml",
		csvFilename: "export-derivatives.csv",
		takesTaxpayer: false,
	},
];

function reportYearsOf(events: FinancialEvents): number[] {
	const years = new Set<number>();
	for (const grouping of events.groupings) {
		for (const trade of grouping.stockTrades) {
			years.add(trade.date.year);
		}
		for (const transaction of grouping.cashTransactions) {
			years.add(transaction.date.year);
		}
		for (const derivative of grouping.derivativeGroupings) {
			for (const trade of derivative.derivativeTrades) {
				years.add(trade.date.year);
			}
		}
	}
	return [...years].sort((a, b) => a - b);
}

function defaultTaxYear(years: number[], today: DateTime): number {
	const lastYear = today.year - 1;
	const upToLastYear = years.filter((year) => year <= lastYear);
	return upToLastYear.at(-1) ?? years[0] ?? lastYear;
}

// The taxpayer block a form's XML is written with, from what the download asked for. The XML's
// header takes the tax number, name and address, and its residency the country; the rest of the
// block isn't written into any form, so it is fixed.
function taxpayerInfoOf(details: TaxpayerDetails): TaxpayerInfo {
	return TaxpayerConfigSchema.parse({
		taxNumber: details.taxNumber,
		taxpayerType: TaxpayerType.NATURAL_PERSON,
		name: details.name,
		address1: details.address,
		address2: null,
		city: details.city,
		postNumber: details.postNumber,
		postName: details.postName,
		municipalityName: "",
		birthDate: "1990-01-01",
		maticnaStevilka: "",
		invalidskoPodjetje: false,
		resident: details.countryId === "SI",
		activityCode: "",
		activityName: "",
		countryId: details.countryId,
		countryName: "",
	});
}

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
	const forms = computed(() =>
		taxAuthorityForms.filter((form) => form.authorityId === args.authorityId()),
	);
	const years = computed(() => reportYearsOf(args.imported().events));
	const year = ref(defaultTaxYear(years.value, args.today));
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
		[args.imported, args.authorityId, year, args.payers],
		async ([imported, authorityId, picked, payers]) => {
			const run = ++runs;
			pending.value = true;
			error.value = null;
			definePayers(payers);
			const lotMatchingMethod = TaxAuthorityLotMatchingMethod.FIFO;
			try {
				const made = await Promise.all(
					forms.value.map(async (form): Promise<TaxYearReport> => {
						const { csv, provenance } = await args.pipeline.generate(imported, {
							authorityId,
							reportTypeId: form.reportTypeId,
							taxpayerInfo: taxpayerInfoOf(nobody),
							reportConfig: reportConfigOf(picked, lotMatchingMethod),
						});
						return {
							form,
							outputs: {
								csv,
								xmlFilename: form.xmlFilename,
								csvFilename: form.csvFilename,
								authorityId,
								reportTypeId: form.reportTypeId,
								year: picked,
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
		forms,
		years,
		year,
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
