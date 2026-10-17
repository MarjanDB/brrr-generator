import { Lookups } from "@brrr/__tests__/Acceptance/Lookups";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const paymentInLieu = TestKit.ibkr.paymentInLieuOfDividends;

describe("IBKR: a McDonald's payment in lieu of dividend in 2024 with US withholding tax", () => {
	const { events } = Scenario.pipeline.run(paymentInLieu.readInputs());

	test("DIV 2024", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.DIV,
			year: 2024,
			info: Scenario.config.infoProvider(Lookups),
		});

		await Scenario.pipeline.expectToMatch(
			report,
			paymentInLieu.expectedReport("slovenia/2024/div"),
		);
	});
});
