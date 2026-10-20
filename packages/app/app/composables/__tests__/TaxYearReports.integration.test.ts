import { readFileSync } from "node:fs";
import {
	createContainer,
	PredefinedInfoProvider,
	ProvenanceDetailKind,
	ProvenanceReportReader,
	ReportPipeline,
	SlovenianReportTypeId,
	TaxAuthorityId,
} from "@brrr/lib";
import { TestKit } from "@brrr/test-cases";
import { DateTime } from "luxon";
import { describe, expect, test, vi } from "vitest";
import { shallowRef } from "vue";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { provideTaxYearReports } from "~/composables/useTaxYearReports";
import type { DefinedPayer } from "~/types/reportFlow";

const info = new PredefinedInfoProvider();
const pipeline = createContainer(info).get(ReportPipeline);
const noPayers: ReadonlyMap<string, DefinedPayer> = new Map();

describe("every form a tax authority makes for a year, on the test cases' real imports", () => {
	test("Slovenia's three forms, in their tabs' order, each made for the year", async () => {
		const stockTrade = TestKit.ibkr.stockTrade;
		const imported = pipeline.read(stockTrade.readInputs());

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				today: DateTime.fromISO("2023-06-01"),
				payers: () => noPayers,
			}),
		);
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));

		expect(taxYear.error.value).toBeNull();
		expect(taxYear.reports.value).toHaveLength(3);
		expect(taxYear.reports.value[0]?.form.reportTypeId).toEqual(SlovenianReportTypeId.KDVP);
		expect(taxYear.reports.value[1]?.form.reportTypeId).toEqual(SlovenianReportTypeId.DIV);
		expect(taxYear.reports.value[2]?.form.reportTypeId).toEqual(SlovenianReportTypeId.IFI);
		expect(taxYear.reports.value[0]?.outputs.year).toEqual(2022);
		expect(taxYear.reports.value[0]?.outputs.csvFilename).toEqual("export-trades.csv");
		expect(taxYear.reports.value[0]?.outputs.csv).toEqual(
			readFileSync(stockTrade.expected.slovenia.kdvpFifo.csvPath, "utf-8"),
		);
	});

	test("the taxpayer's details start empty, but for the country", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				today: DateTime.fromISO("2023-06-01"),
				payers: () => noPayers,
			}),
		);

		expect(taxYear.taxpayer.value.taxNumber).toEqual("");
		expect(taxYear.taxpayer.value.name).toEqual("");
		expect(taxYear.taxpayer.value.address).toEqual("");
		expect(taxYear.taxpayer.value.city).toEqual("");
		expect(taxYear.taxpayer.value.postNumber).toEqual("");
		expect(taxYear.taxpayer.value.postName).toEqual("");
		expect(taxYear.taxpayer.value.countryId).toEqual("SI");
	});

	test("a form's XML is written with the taxpayer's details when it's downloaded", async () => {
		const stockTrade = TestKit.ibkr.stockTrade;
		const imported = pipeline.read(stockTrade.readInputs());
		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				today: DateTime.fromISO("2023-06-01"),
				payers: () => noPayers,
			}),
		);
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));
		const kdvp = taxYear.reports.value[0];
		if (kdvp === undefined) {
			throw new Error("no Doh-KDVP report");
		}

		const xml = await taxYear.xmlWith(kdvp.outputs, {
			taxNumber: "12345678",
			name: "Ime Priimek",
			address: "Naslov 1",
			city: "Ljubljana",
			postNumber: "1000",
			postName: "Ljubljana",
			countryId: "SI",
		});

		expect(xml).toEqual(readFileSync(stockTrade.expected.slovenia.kdvpFifo.xmlPath, "utf-8"));
	});

	test("picking another year makes the forms again, for that year", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				today: DateTime.fromISO("2023-06-01"),
				payers: () => noPayers,
			}),
		);
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));

		taxYear.year.value = 2023;
		await vi.waitFor(() => expect(taxYear.reports.value[0]?.outputs.year).toEqual(2023));

		expect(taxYear.pending.value).toEqual(false);
		expect(taxYear.reports.value[1]?.outputs.year).toEqual(2023);
		expect(taxYear.reports.value[2]?.outputs.year).toEqual(2023);
	});

	test("picking another year keeps the last year's forms until the new ones are made", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		let gate: Promise<void> = Promise.resolve();
		let release = () => {};
		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline: {
					generate: async (from, request) => {
						await gate;
						return pipeline.generate(from, request);
					},
				},
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				today: DateTime.fromISO("2023-06-01"),
				payers: () => noPayers,
			}),
		);
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));
		gate = new Promise((resolve) => {
			release = resolve;
		});

		taxYear.year.value = 2023;
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(true));

		expect(taxYear.reports.value[0]?.outputs.year).toEqual(2022);
		expect(taxYear.reports.value[1]?.outputs.year).toEqual(2022);
		expect(taxYear.reports.value[2]?.outputs.year).toEqual(2022);

		release();
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));

		expect(taxYear.reports.value[0]?.outputs.year).toEqual(2023);
	});

	test("a payer defined for the session goes on Doh-Div, made again with it", async () => {
		const lookups = new PredefinedInfoProvider();
		const ownPipeline = createContainer(lookups).get(ReportPipeline);
		const imported = ownPipeline.read(TestKit.ibkr.dividends.readInputs());
		const payers = shallowRef<ReadonlyMap<string, DefinedPayer>>(new Map());
		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline: ownPipeline,
				info: lookups,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				today: DateTime.fromISO("2023-06-01"),
				payers: () => payers.value,
			}),
		);
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));
		const before = taxYear.reports.value[1];
		if (before === undefined) {
			throw new Error("no Doh-Div report");
		}
		const warningsBefore = new ProvenanceReportReader().read(before.outputs.provenance).warnings;
		expect(warningsBefore).toHaveLength(1);
		expect(warningsBefore[0]?.detail.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);

		payers.value = new Map([
			[
				"FR0000120271",
				{
					definition: {
						isin: "FR0000120271",
						name: "TotalEnergies SE",
						street: "2 Place Jean Millier",
						city: "Courbevoie",
						countryName: "France",
						countryCode: "FR",
					},
					resolves: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				},
			],
		]);
		await vi.waitFor(() => expect(taxYear.reports.value[1]).not.toBe(before));
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));

		const after = taxYear.reports.value[1];
		if (after === undefined) {
			throw new Error("no Doh-Div report");
		}
		expect(after.outputs.csv).toContain(
			'FR0000120271,TotalEnergies SE,"2 Place Jean Millier, Courbevoie",FR,',
		);
		expect(new ProvenanceReportReader().read(after.outputs.provenance).warnings).toHaveLength(0);
	});

	test("removing a payer's definition makes Doh-Div again without it", async () => {
		const lookups = new PredefinedInfoProvider();
		const ownPipeline = createContainer(lookups).get(ReportPipeline);
		const imported = ownPipeline.read(TestKit.ibkr.dividends.readInputs());
		const payers = shallowRef<ReadonlyMap<string, DefinedPayer>>(
			new Map([
				[
					"FR0000120271",
					{
						definition: {
							isin: "FR0000120271",
							name: "TotalEnergies SE",
							street: "2 Place Jean Millier",
							city: "Courbevoie",
							countryName: "France",
							countryCode: "FR",
						},
						resolves: ProvenanceDetailKind.COMPANY_NOT_FOUND,
					},
				],
			]),
		);
		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline: ownPipeline,
				info: lookups,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				today: DateTime.fromISO("2023-06-01"),
				payers: () => payers.value,
			}),
		);
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));
		const before = taxYear.reports.value[1];
		if (before === undefined) {
			throw new Error("no Doh-Div report");
		}
		expect(before.outputs.csv).toContain("TotalEnergies SE");

		payers.value = new Map();
		await vi.waitFor(() => expect(taxYear.reports.value[1]).not.toBe(before));
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));

		const after = taxYear.reports.value[1];
		if (after === undefined) {
			throw new Error("no Doh-Div report");
		}
		expect(after.outputs.csv).not.toContain("TotalEnergies SE");
		const warningsAfter = new ProvenanceReportReader().read(after.outputs.provenance).warnings;
		expect(warningsAfter).toHaveLength(1);
		expect(warningsAfter[0]?.detail.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
	});
});

describe("the forms, the years an import can make reports for, and the year the step opens on", () => {
	test("the forms are the authority's, in their tabs' order", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2023-06-01"),
			}),
		);

		expect(taxYear.forms.value).toHaveLength(3);
		expect(taxYear.forms.value[0]?.code).toEqual("Doh-KDVP");
		expect(taxYear.forms.value[1]?.code).toEqual("Doh-Div");
		expect(taxYear.forms.value[2]?.code).toEqual("D-IFI");
	});

	test("every year a trade or a payment falls in, oldest first", async () => {
		const imported = pipeline.read([
			...TestKit.ibkr.optionTrade.readInputs(),
			...TestKit.ibkr.stockTrade.readInputs(),
		]);

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2024-06-01"),
			}),
		);

		expect(taxYear.years.value).toEqual([2022, 2023]);
	});

	test("a year counts once, however much falls in it", async () => {
		const imported = pipeline.read(TestKit.ibkr.split.readInputs());

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2025-06-01"),
			}),
		);

		expect(taxYear.years.value).toEqual([2024]);
	});

	test("an import with nothing in it has no years", async () => {
		const imported = pipeline.read([
			TestKit.ibkr.corporateAction.inputs.simpleCorporateAction.read(),
		]);

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2026-10-19"),
			}),
		);

		expect(taxYear.years.value).toEqual([]);
	});

	test("it opens on last year, when the import has something in it", async () => {
		const imported = pipeline.read([
			...TestKit.ibkr.optionTrade.readInputs(),
			...TestKit.ibkr.stockTrade.readInputs(),
		]);

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2024-06-01"),
			}),
		);

		expect(taxYear.year.value).toEqual(2023);
	});

	test("it opens on the latest year before last year, when last year has nothing", async () => {
		const imported = pipeline.read([
			...TestKit.ibkr.optionTrade.readInputs(),
			...TestKit.ibkr.stockTrade.readInputs(),
		]);

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2025-10-19"),
			}),
		);

		expect(taxYear.year.value).toEqual(2023);
	});

	test("it opens on the earliest year after last year, when the import has nothing up to last year", async () => {
		const imported = pipeline.read([
			...TestKit.ibkr.optionTrade.readInputs(),
			...TestKit.ibkr.stockTrade.readInputs(),
		]);

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2022-06-01"),
			}),
		);

		expect(taxYear.year.value).toEqual(2022);
	});

	test("it opens on last year, when the import has nothing at all", async () => {
		const imported = pipeline.read([
			TestKit.ibkr.corporateAction.inputs.simpleCorporateAction.read(),
		]);

		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2026-10-19"),
			}),
		);

		expect(taxYear.year.value).toEqual(2025);
	});
});

describe("the taxpayer block a form's XML is written with", () => {
	test("leaves what wasn't filled in empty", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2023-06-01"),
			}),
		);
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));
		const kdvp = taxYear.reports.value[0];
		if (kdvp === undefined) {
			throw new Error("no Doh-KDVP report");
		}

		const xml = await taxYear.xmlWith(kdvp.outputs, {
			taxNumber: "",
			name: "",
			address: "",
			city: "",
			postNumber: "",
			postName: "",
			countryId: "SI",
		});

		expect(xml).toContain("<edp:taxNumber></edp:taxNumber>");
		expect(xml).toContain("<edp:taxpayerType>FO</edp:taxpayerType>");
		expect(xml).toContain("<edp:name></edp:name>");
		expect(xml).toContain("<edp:address1></edp:address1>");
		expect(xml).toContain("<edp:city></edp:city>");
		expect(xml).toContain("<edp:postNumber></edp:postNumber>");
		expect(xml).toContain("<edp:postName></edp:postName>");
		expect(xml).toContain("<IsResident>true</IsResident>");
	});

	test("a taxpayer from another country isn't a resident", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const taxYear = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				payers: () => noPayers,
				today: DateTime.fromISO("2023-06-01"),
			}),
		);
		await vi.waitFor(() => expect(taxYear.pending.value).toEqual(false));
		const kdvp = taxYear.reports.value[0];
		if (kdvp === undefined) {
			throw new Error("no Doh-KDVP report");
		}

		const xml = await taxYear.xmlWith(kdvp.outputs, {
			taxNumber: "",
			name: "",
			address: "",
			city: "",
			postNumber: "",
			postName: "",
			countryId: "AT",
		});

		expect(xml).toContain("<IsResident>false</IsResident>");
	});
});
