import { createContainer, PredefinedInfoProvider, ReportPipeline } from "@brrr/lib";
import { TestKit } from "@brrr/test-cases";
import { describe, expect, test } from "vitest";
import { reportYearsOf } from "~/utils/taxYears";

const pipeline = createContainer(new PredefinedInfoProvider()).get(ReportPipeline);

describe("the years an import can make reports for, on the test cases' real imports", () => {
	test("every year a trade or a payment falls in, oldest first", () => {
		const imported = pipeline.read([
			...TestKit.ibkr.optionTrade.readInputs(),
			...TestKit.ibkr.stockTrade.readInputs(),
		]);

		expect(reportYearsOf(imported.events)).toEqual([2022, 2023]);
	});

	test("a year counts once, however much falls in it", () => {
		const imported = pipeline.read(TestKit.ibkr.split.readInputs());

		expect(reportYearsOf(imported.events)).toEqual([2024]);
	});

	test("an import with nothing in it has no years", () => {
		const imported = pipeline.read([
			TestKit.ibkr.corporateAction.inputs.simpleCorporateAction.read(),
		]);

		expect(reportYearsOf(imported.events)).toEqual([]);
	});
});
