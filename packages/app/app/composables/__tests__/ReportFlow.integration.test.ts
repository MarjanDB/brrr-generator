import {
	createContainer,
	PredefinedInfoProvider,
	ProvenanceDetailKind,
	ReportPipeline,
	TaxAuthorityId,
} from "@brrr/lib";
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
		expect(flow.payers.value.size).toEqual(0);
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

	test("a payer defined by hand is kept by its ISIN, with the problem it resolves", async () => {
		const flow = await mountComposable(() => provideReportFlow());

		flow.definePayer({
			definition: {
				isin: "XS0000000009",
				name: "Nope Holdings plc",
				street: "1 Example Street",
				city: "London",
				countryName: "United Kingdom",
				countryCode: "GB",
			},
			resolves: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
		});

		expect(flow.payers.value.size).toEqual(1);
		expect(flow.payers.value.get("XS0000000009")?.definition.name).toEqual("Nope Holdings plc");
		expect(flow.payers.value.get("XS0000000009")?.resolves).toEqual(
			ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
		);
	});

	test("defining a payer again replaces it, and removing it drops it", async () => {
		const flow = await mountComposable(() => provideReportFlow());
		flow.definePayer({
			definition: {
				isin: "XS0000000009",
				name: "Nope Holdings plc",
				street: "1 Example Street",
				city: "London",
				countryName: "United Kingdom",
				countryCode: "GB",
			},
			resolves: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
		});

		flow.definePayer({
			definition: {
				isin: "XS0000000009",
				name: "Nope Holdings SE",
				street: "2 Rue Exemple",
				city: "Paris",
				countryName: "France",
				countryCode: "FR",
			},
			resolves: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
		});

		expect(flow.payers.value.size).toEqual(1);
		expect(flow.payers.value.get("XS0000000009")?.definition.name).toEqual("Nope Holdings SE");

		flow.removePayer("XS0000000009");

		expect(flow.payers.value.size).toEqual(0);
	});

	test("starting over clears everything", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);
		flow.confirmReview();
		flow.chooseAuthority(TaxAuthorityId.SLOVENIA);
		flow.definePayer({
			definition: {
				isin: "XS0000000009",
				name: "Nope Holdings plc",
				street: "1 Example Street",
				city: "London",
				countryName: "United Kingdom",
				countryCode: "GB",
			},
			resolves: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
		});
		const startsBefore = flow.startCount.value;

		flow.startOver();

		expect(flow.startCount.value).toEqual(startsBefore + 1);
		expect(flow.imported.value).toBeNull();
		expect(flow.reviewConfirmed.value).toEqual(false);
		expect(flow.authority.value).toBeNull();
		expect(flow.payers.value.size).toEqual(0);
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

describe("the step a flow page shows", () => {
	test("a step past the furthest one shows the first step that's missing", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);

		expect(flow.stepShownFor(ReportStep.CONFIGURE)).toEqual(ReportStep.REVIEW);
	});

	test("download shows upload when nothing is uploaded", async () => {
		const flow = await mountComposable(() => provideReportFlow());

		expect(flow.stepShownFor(ReportStep.DOWNLOAD)).toEqual(ReportStep.UPLOAD);
	});

	test("an earlier step than the furthest one shows itself", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);
		flow.confirmReview();
		flow.chooseAuthority(TaxAuthorityId.SLOVENIA);

		expect(flow.stepShownFor(ReportStep.REVIEW)).toEqual(ReportStep.REVIEW);
	});

	test("the furthest step shows itself", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);
		flow.confirmReview();
		flow.chooseAuthority(TaxAuthorityId.SLOVENIA);

		expect(flow.stepShownFor(ReportStep.DOWNLOAD)).toEqual(ReportStep.DOWNLOAD);
	});
});

describe("the step a flow page's path names", () => {
	test("an English path names its step", async () => {
		const flow = await mountComposable(() => provideReportFlow());

		expect(flow.stepOfPath("/en/report/configure")).toEqual(ReportStep.CONFIGURE);
	});

	test("a Slovenian path names its step", async () => {
		const flow = await mountComposable(() => provideReportFlow());

		expect(flow.stepOfPath("/sl/report/review")).toEqual(ReportStep.REVIEW);
	});

	test("the flow's own path names no step", async () => {
		const flow = await mountComposable(() => provideReportFlow());

		expect(flow.stepOfPath("/en/report")).toBeNull();
	});

	test("the landing page's path names no step", async () => {
		const flow = await mountComposable(() => provideReportFlow());

		expect(flow.stepOfPath("/en")).toBeNull();
	});
});

describe("the key a step page is kept under while the flow moves on", () => {
	test("upload keeps its page until the flow starts over", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		const before = flow.pageKeyOf(ReportStep.UPLOAD);

		flow.acceptImport(imported);
		const afterAnImport = flow.pageKeyOf(ReportStep.UPLOAD);
		flow.startOver();
		const afterStartingOver = flow.pageKeyOf(ReportStep.UPLOAD);

		expect(afterAnImport).toEqual(before);
		expect(afterStartingOver).not.toEqual(before);
	});

	test("configure keeps its page until a new import", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);
		const before = flow.pageKeyOf(ReportStep.CONFIGURE);

		flow.confirmReview();
		const afterConfirming = flow.pageKeyOf(ReportStep.CONFIGURE);
		flow.acceptImport(imported);
		const afterAnImport = flow.pageKeyOf(ReportStep.CONFIGURE);

		expect(afterConfirming).toEqual(before);
		expect(afterAnImport).not.toEqual(before);
	});

	test("review keeps its page until a new import", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);
		const before = flow.pageKeyOf(ReportStep.REVIEW);

		flow.acceptImport(imported);
		const afterAnImport = flow.pageKeyOf(ReportStep.REVIEW);

		expect(afterAnImport).not.toEqual(before);
	});

	test("download keeps its page, with its year and tab, until a new import", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);
		flow.confirmReview();
		flow.chooseAuthority(TaxAuthorityId.SLOVENIA);
		const before = flow.pageKeyOf(ReportStep.DOWNLOAD);

		flow.chooseAuthority(TaxAuthorityId.SLOVENIA);
		const afterChoosingAgain = flow.pageKeyOf(ReportStep.DOWNLOAD);
		flow.acceptImport(imported);
		const afterAnImport = flow.pageKeyOf(ReportStep.DOWNLOAD);

		expect(afterChoosingAgain).toEqual(before);
		expect(afterAnImport).not.toEqual(before);
	});

	test("no page outlives starting over", async () => {
		const imported = pipeline.read(TestKit.ibkr.stockTrade.readInputs());
		const flow = await mountComposable(() => provideReportFlow());
		flow.acceptImport(imported);
		const before = flow.pageKeyOf(ReportStep.REVIEW);

		flow.startOver();
		const afterStartingOver = flow.pageKeyOf(ReportStep.REVIEW);

		expect(afterStartingOver).not.toEqual(before);
	});
});
