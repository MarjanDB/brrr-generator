import { describe, expect, test } from "vitest";
import { ReportStep } from "~/types/reportFlow";
import { furthestStepOf, reportPageKey, reportStepOfPath, stepToShow } from "~/utils/reportFlow";

describe("how far the report flow lets you go", () => {
	test("with nothing uploaded, only upload", () => {
		const furthest = furthestStepOf({ hasImport: false, reviewConfirmed: false, hasReport: false });

		expect(furthest).toEqual(ReportStep.UPLOAD);
	});

	test("with an import, up to review", () => {
		const furthest = furthestStepOf({ hasImport: true, reviewConfirmed: false, hasReport: false });

		expect(furthest).toEqual(ReportStep.REVIEW);
	});

	test("with the review confirmed, up to configure", () => {
		const furthest = furthestStepOf({ hasImport: true, reviewConfirmed: true, hasReport: false });

		expect(furthest).toEqual(ReportStep.CONFIGURE);
	});

	test("with a report, up to download", () => {
		const furthest = furthestStepOf({ hasImport: true, reviewConfirmed: true, hasReport: true });

		expect(furthest).toEqual(ReportStep.DOWNLOAD);
	});
});

describe("the step a flow page shows", () => {
	test("a step past the furthest one shows the first step that's missing", () => {
		const shown = stepToShow(ReportStep.CONFIGURE, ReportStep.REVIEW);

		expect(shown).toEqual(ReportStep.REVIEW);
	});

	test("download without a report shows upload when nothing is uploaded", () => {
		const shown = stepToShow(ReportStep.DOWNLOAD, ReportStep.UPLOAD);

		expect(shown).toEqual(ReportStep.UPLOAD);
	});

	test("an earlier step than the furthest one shows itself", () => {
		const shown = stepToShow(ReportStep.REVIEW, ReportStep.DOWNLOAD);

		expect(shown).toEqual(ReportStep.REVIEW);
	});

	test("the furthest step shows itself", () => {
		const shown = stepToShow(ReportStep.DOWNLOAD, ReportStep.DOWNLOAD);

		expect(shown).toEqual(ReportStep.DOWNLOAD);
	});
});

describe("the step a flow page's path names", () => {
	test("an English path names its step", () => {
		expect(reportStepOfPath("/en/report/configure")).toEqual(ReportStep.CONFIGURE);
	});

	test("a Slovenian path names its step", () => {
		expect(reportStepOfPath("/sl/report/review")).toEqual(ReportStep.REVIEW);
	});

	test("the flow's own path names no step", () => {
		expect(reportStepOfPath("/en/report")).toBeNull();
	});

	test("the landing page's path names no step", () => {
		expect(reportStepOfPath("/en")).toBeNull();
	});
});

describe("the key a step page is kept under while the flow moves on", () => {
	test("upload keeps its page until the flow starts over", () => {
		const before = reportPageKey(ReportStep.UPLOAD, { starts: 0, imports: 1, reports: 0 });
		const afterAnImport = reportPageKey(ReportStep.UPLOAD, { starts: 0, imports: 2, reports: 0 });
		const afterStartingOver = reportPageKey(ReportStep.UPLOAD, {
			starts: 1,
			imports: 2,
			reports: 0,
		});

		expect(afterAnImport).toEqual(before);
		expect(afterStartingOver).not.toEqual(before);
	});

	test("configure keeps its page until a new import", () => {
		const before = reportPageKey(ReportStep.CONFIGURE, { starts: 0, imports: 1, reports: 1 });
		const afterAReport = reportPageKey(ReportStep.CONFIGURE, { starts: 0, imports: 1, reports: 2 });
		const afterAnImport = reportPageKey(ReportStep.CONFIGURE, {
			starts: 0,
			imports: 2,
			reports: 2,
		});

		expect(afterAReport).toEqual(before);
		expect(afterAnImport).not.toEqual(before);
	});

	test("review keeps its page until a new import", () => {
		const before = reportPageKey(ReportStep.REVIEW, { starts: 0, imports: 1, reports: 0 });
		const afterAnImport = reportPageKey(ReportStep.REVIEW, { starts: 0, imports: 2, reports: 0 });

		expect(afterAnImport).not.toEqual(before);
	});

	test("download starts afresh for each report", () => {
		const before = reportPageKey(ReportStep.DOWNLOAD, { starts: 0, imports: 1, reports: 1 });
		const afterAReport = reportPageKey(ReportStep.DOWNLOAD, { starts: 0, imports: 1, reports: 2 });

		expect(afterAReport).not.toEqual(before);
	});

	test("no page outlives starting over", () => {
		const before = reportPageKey(ReportStep.REVIEW, { starts: 0, imports: 1, reports: 0 });
		const afterStartingOver = reportPageKey(ReportStep.REVIEW, {
			starts: 1,
			imports: 1,
			reports: 0,
		});

		expect(afterStartingOver).not.toEqual(before);
	});
});
