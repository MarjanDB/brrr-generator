import { describe, expect, test } from "vitest";
import { ReportStep } from "~/types/reportFlow";
import { furthestStepOf, reportPageKey, reportStepOfPath, stepToShow } from "~/utils/reportFlow";

describe("how far the report flow lets you go", () => {
	test("with nothing uploaded, only upload", () => {
		const furthest = furthestStepOf({
			hasImport: false,
			reviewConfirmed: false,
			hasAuthority: false,
		});

		expect(furthest).toEqual(ReportStep.UPLOAD);
	});

	test("with an import, up to review", () => {
		const furthest = furthestStepOf({
			hasImport: true,
			reviewConfirmed: false,
			hasAuthority: false,
		});

		expect(furthest).toEqual(ReportStep.REVIEW);
	});

	test("with the review confirmed, up to configure", () => {
		const furthest = furthestStepOf({
			hasImport: true,
			reviewConfirmed: true,
			hasAuthority: false,
		});

		expect(furthest).toEqual(ReportStep.CONFIGURE);
	});

	test("with a tax authority chosen, up to download", () => {
		const furthest = furthestStepOf({ hasImport: true, reviewConfirmed: true, hasAuthority: true });

		expect(furthest).toEqual(ReportStep.DOWNLOAD);
	});
});

describe("the step a flow page shows", () => {
	test("a step past the furthest one shows the first step that's missing", () => {
		const shown = stepToShow(ReportStep.CONFIGURE, ReportStep.REVIEW);

		expect(shown).toEqual(ReportStep.REVIEW);
	});

	test("download without a tax authority shows upload when nothing is uploaded", () => {
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
		const before = reportPageKey(ReportStep.UPLOAD, { starts: 0, imports: 1 });
		const afterAnImport = reportPageKey(ReportStep.UPLOAD, { starts: 0, imports: 2 });
		const afterStartingOver = reportPageKey(ReportStep.UPLOAD, { starts: 1, imports: 2 });

		expect(afterAnImport).toEqual(before);
		expect(afterStartingOver).not.toEqual(before);
	});

	test("configure keeps its page until a new import", () => {
		const before = reportPageKey(ReportStep.CONFIGURE, { starts: 0, imports: 1 });
		const again = reportPageKey(ReportStep.CONFIGURE, { starts: 0, imports: 1 });
		const afterAnImport = reportPageKey(ReportStep.CONFIGURE, { starts: 0, imports: 2 });

		expect(again).toEqual(before);
		expect(afterAnImport).not.toEqual(before);
	});

	test("review keeps its page until a new import", () => {
		const before = reportPageKey(ReportStep.REVIEW, { starts: 0, imports: 1 });
		const afterAnImport = reportPageKey(ReportStep.REVIEW, { starts: 0, imports: 2 });

		expect(afterAnImport).not.toEqual(before);
	});

	test("download keeps its page, with its year and tab, until a new import", () => {
		const before = reportPageKey(ReportStep.DOWNLOAD, { starts: 0, imports: 1 });
		const again = reportPageKey(ReportStep.DOWNLOAD, { starts: 0, imports: 1 });
		const afterAnImport = reportPageKey(ReportStep.DOWNLOAD, { starts: 0, imports: 2 });

		expect(again).toEqual(before);
		expect(afterAnImport).not.toEqual(before);
	});

	test("no page outlives starting over", () => {
		const before = reportPageKey(ReportStep.REVIEW, { starts: 0, imports: 1 });
		const afterStartingOver = reportPageKey(ReportStep.REVIEW, { starts: 1, imports: 1 });

		expect(afterStartingOver).not.toEqual(before);
	});
});
