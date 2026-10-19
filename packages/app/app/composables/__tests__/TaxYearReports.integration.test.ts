import { readFileSync } from "node:fs";
import {
	createContainer,
	PredefinedInfoProvider,
	ReportPipeline,
	SlovenianReportTypeId,
	TaxAuthorityId,
} from "@brrr/lib";
import { TestKit } from "@brrr/test-cases";
import { describe, expect, test, vi } from "vitest";
import { ref } from "vue";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { provideTaxYearReports } from "~/composables/useTaxYearReports";

const pipeline = createContainer(new PredefinedInfoProvider()).get(ReportPipeline);

describe("every form a tax authority makes for a year, on the test cases' real imports", () => {
	test("Slovenia's three forms, in their tabs' order, each made for the year", async () => {
		const stockTrade = TestKit.ibkr.stockTrade;
		const imported = pipeline.read(stockTrade.readInputs());

		const year = await mountComposable(() =>
			provideTaxYearReports({
				pipeline,
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => 2022,
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
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => 2022,
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
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => 2022,
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
				imported: () => imported,
				authorityId: () => TaxAuthorityId.SLOVENIA,
				year: () => picked.value,
			}),
		);
		await vi.waitFor(() => expect(year.pending.value).toEqual(false));

		picked.value = 2023;
		await vi.waitFor(() => expect(year.reports.value[0]?.outputs.year).toEqual(2023));

		expect(year.pending.value).toEqual(false);
		expect(year.reports.value[1]?.outputs.year).toEqual(2023);
		expect(year.reports.value[2]?.outputs.year).toEqual(2023);
	});
});
