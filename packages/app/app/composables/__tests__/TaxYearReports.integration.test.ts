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
import { describe, expect, test, vi } from "vitest";
import { ref, shallowRef } from "vue";
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

		const year = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => 2022,
				payers: () => noPayers,
			}),
		);
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));

		expect(year.error.value).toBeNull();
		expect(year.reports.value).toHaveLength(3);
		expect(year.reports.value[0]?.form.reportTypeId).toEqual(SlovenianReportTypeId.KDVP);
		expect(year.reports.value[1]?.form.reportTypeId).toEqual(SlovenianReportTypeId.DIV);
		expect(year.reports.value[2]?.form.reportTypeId).toEqual(SlovenianReportTypeId.IFI);
		expect(year.reports.value[0]?.outputs.year).toEqual(2022);
		expect(year.reports.value[0]?.outputs.csvFilename).toEqual("export-trades.csv");
		expect(year.reports.value[0]?.outputs.csv).toEqual(
			readFileSync(stockTrade.expected.slovenia.kdvpFifo.csvPath, "utf-8"),
		);
	});

	test("the taxpayer's details start empty, but for the country", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());

		const year = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => 2022,
				payers: () => noPayers,
			}),
		);

		expect(year.taxpayer.value.taxNumber).toEqual("");
		expect(year.taxpayer.value.name).toEqual("");
		expect(year.taxpayer.value.address).toEqual("");
		expect(year.taxpayer.value.city).toEqual("");
		expect(year.taxpayer.value.postNumber).toEqual("");
		expect(year.taxpayer.value.postName).toEqual("");
		expect(year.taxpayer.value.countryId).toEqual("SI");
	});

	test("a form's XML is written with the taxpayer's details when it's downloaded", async () => {
		const stockTrade = TestKit.ibkr.stockTrade;
		const imported = pipeline.read(stockTrade.readInputs());
		const year = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => 2022,
				payers: () => noPayers,
			}),
		);
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));
		const kdvp = year.reports.value[0];
		if (kdvp === undefined) {
			throw new Error("no Doh-KDVP report");
		}

		const xml = await year.xmlWith(kdvp.outputs, {
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
		const picked = ref(2022);
		const year = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				info,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => picked.value,
				payers: () => noPayers,
			}),
		);
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));

		picked.value = 2023;
		await vi.waitFor(() => expect(year.reports.value[0]?.outputs.year).toEqual(2023));

		expect(year.pending.value).toEqual(false);
		expect(year.reports.value[1]?.outputs.year).toEqual(2023);
		expect(year.reports.value[2]?.outputs.year).toEqual(2023);
	});

	test("picking another year keeps the last year's forms until the new ones are made", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const picked = ref(2022);
		let gate: Promise<void> = Promise.resolve();
		let release = () => {};
		const year = await mountComposable(() =>
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
				year: () => picked.value,
				payers: () => noPayers,
			}),
		);
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));
		gate = new Promise((resolve) => {
			release = resolve;
		});

		picked.value = 2023;
		await vi.waitFor(() => expect(year.pending.value).toEqual(true));

		expect(year.reports.value[0]?.outputs.year).toEqual(2022);
		expect(year.reports.value[1]?.outputs.year).toEqual(2022);
		expect(year.reports.value[2]?.outputs.year).toEqual(2022);

		release();
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));

		expect(year.reports.value[0]?.outputs.year).toEqual(2023);
	});

	test("a payer defined for the session goes on Doh-Div, made again with it", async () => {
		const lookups = new PredefinedInfoProvider();
		const ownPipeline = createContainer(lookups).get(ReportPipeline);
		const imported = ownPipeline.read(TestKit.ibkr.dividends.readInputs());
		const payers = shallowRef<ReadonlyMap<string, DefinedPayer>>(new Map());
		const year = await mountComposable(() =>
			provideTaxYearReports({
				pipeline: ownPipeline,
				info: lookups,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => 2022,
				payers: () => payers.value,
			}),
		);
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));
		const before = year.reports.value[1];
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
		await vi.waitFor(() => expect(year.reports.value[1]).not.toBe(before));
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));

		const after = year.reports.value[1];
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
		const year = await mountComposable(() =>
			provideTaxYearReports({
				pipeline: ownPipeline,
				info: lookups,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => 2022,
				payers: () => payers.value,
			}),
		);
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));
		const before = year.reports.value[1];
		if (before === undefined) {
			throw new Error("no Doh-Div report");
		}
		expect(before.outputs.csv).toContain("TotalEnergies SE");

		payers.value = new Map();
		await vi.waitFor(() => expect(year.reports.value[1]).not.toBe(before));
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));

		const after = year.reports.value[1];
		if (after === undefined) {
			throw new Error("no Doh-Div report");
		}
		expect(after.outputs.csv).not.toContain("TotalEnergies SE");
		const warningsAfter = new ProvenanceReportReader().read(after.outputs.provenance).warnings;
		expect(warningsAfter).toHaveLength(1);
		expect(warningsAfter[0]?.detail.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
	});
});
