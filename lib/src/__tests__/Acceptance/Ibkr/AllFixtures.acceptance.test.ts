import { Lookups } from "@brrr/__tests__/Acceptance/Lookups";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const allFixtures = TestKit.ibkr.allFixtures;

const reports = [
	{ report: SlovenianReportTypeId.KDVP, name: "kdvp-fifo" },
	{ report: SlovenianReportTypeId.DIV, name: "div" },
	{ report: SlovenianReportTypeId.IFI, name: "ifi-fifo" },
];
const runs = [2022, 2023, 2024].flatMap((year) => reports.map((run) => ({ ...run, year })));

// Every IBKR export at once: merging several exports, corporate actions, several groupings.
describe("IBKR: every export together", () => {
	const { events } = Scenario.pipeline.run(allFixtures.readInputs());

	test.each(runs)("$report $year", async ({ report, name, year }) => {
		const generated = await Scenario.pipeline.generate(events, {
			report,
			year,
			info: Scenario.config.infoProvider(Lookups),
		});

		await Scenario.pipeline.expectToMatch(
			generated,
			allFixtures.expectedReport(`slovenia/${year}/${name}`),
		);
	});
});
