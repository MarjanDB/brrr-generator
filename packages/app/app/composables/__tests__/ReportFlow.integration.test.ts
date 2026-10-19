import { createContainer, PredefinedInfoProvider, ReportPipeline, TaxAuthorityId } from "@brrr/lib";
import { TestKit } from "@brrr/test-cases";
import { describe, expect, test } from "vitest";
import {
	mountComposable,
	mountComposableUnder,
} from "~/composables/__tests__/support/mountComposable";
import { provideReportFlow, useReportFlow } from "~/composables/useReportFlow";
import { ReportStep } from "~/types/reportFlow";

const pipeline = createContainer(new PredefinedInfoProvider()).get(ReportPipeline);

describe("the report flow's state, on the test cases' real imports", () => {
	test("a new flow holds nothing and goes no further than upload", async () => {
		const flow = await mountComposable(() => provideReportFlow());

		expect(flow.imported.value).toBeNull();
		expect(flow.reviewConfirmed.value).toEqual(false);
		expect(flow.authority.value).toBeNull();
		expect(flow.furthestStep.value).toEqual(ReportStep.UPLOAD);
	});

	test("an import lets the flow go up to review", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());

		flow.acceptImport(imported);

		expect(flow.imported.value).toBe(imported);
		expect(flow.furthestStep.value).toEqual(ReportStep.REVIEW);
	});

	test("confirming the review lets the flow go up to configure", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());

		flow.acceptImport(imported);
		flow.confirmReview();

		expect(flow.reviewConfirmed.value).toEqual(true);
		expect(flow.furthestStep.value).toEqual(ReportStep.CONFIGURE);
	});

	test("choosing a tax authority lets the flow go up to download", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());

		flow.acceptImport(imported);
		flow.confirmReview();
		flow.chooseAuthority(TaxAuthorityId.SLOVENIA);

		expect(flow.authority.value).toEqual(TaxAuthorityId.SLOVENIA);
		expect(flow.furthestStep.value).toEqual(ReportStep.DOWNLOAD);
	});

	test("uploading again clears the review and the tax authority, and counts a new import", async () => {
		const first = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const second = pipeline.read(TestKit.ibkr.dividends.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(first);
		flow.confirmReview();
		flow.chooseAuthority(TaxAuthorityId.SLOVENIA);
		const importsBefore = flow.importCount.value;

		flow.acceptImport(second);

		expect(flow.imported.value).toBe(second);
		expect(flow.reviewConfirmed.value).toEqual(false);
		expect(flow.authority.value).toBeNull();
		expect(flow.importCount.value).toEqual(importsBefore + 1);
		expect(flow.furthestStep.value).toEqual(ReportStep.REVIEW);
	});

	test("starting over clears everything", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);
		flow.confirmReview();
		flow.chooseAuthority(TaxAuthorityId.SLOVENIA);
		const startsBefore = flow.startCount.value;

		flow.startOver();

		expect(flow.startCount.value).toEqual(startsBefore + 1);
		expect(flow.imported.value).toBeNull();
		expect(flow.reviewConfirmed.value).toEqual(false);
		expect(flow.authority.value).toBeNull();
		expect(flow.furthestStep.value).toEqual(ReportStep.UPLOAD);
	});

	test("a step page sees the state its parent provided", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposableUnder(
			() => provideReportFlow().acceptImport(imported),
			() => useReportFlow(),
		);

		expect(flow.imported.value).toBe(imported);
	});

	test("asking for the flow outside one throws", async () => {
		await expect(mountComposable(() => useReportFlow())).rejects.toThrow(
			"useReportFlow: no ancestor called provideReportFlow",
		);
	});
});
