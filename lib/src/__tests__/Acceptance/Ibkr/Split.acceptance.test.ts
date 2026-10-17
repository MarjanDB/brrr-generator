import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const split = TestKit.ibkr.split;

// SMCI split 10 for 1 on 2024-09-30 and changed ISIN (an IBKR "FI" corporate action). The 4 shares
// bought before it become 40, and with 15 bought after it, the 55 sold close the position. The
// export is hand-written around the anonymised split rows of CorporateActionsTwoRows.xml.
describe("IBKR: SMCI bought before and after its 10-for-1 split in 2024, then sold", () => {
	const { events } = Scenario.pipeline.run(split.readInputs());

	test("KDVP 2024, FIFO", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.KDVP,
			year: 2024,
		});

		await Scenario.pipeline.expectToMatch(report, split.expectedReport("slovenia/2024/kdvp-fifo"));
	});

	test("the shares bought before the split count ten times over", () => {
		// The provider applies the split before generating; do the same here.
		const { groupings } = new ApplyIdentifierRelationshipsService().apply(events, [
			IdentifierChangeType.SPLIT,
		]);
		const items = new KdvpReportGenerator(Scenario.pipeline.eventsProcessor()).convert(
			Scenario.config.report(2024),
			groupings,
		);
		const quantities = items.flatMap((item) =>
			item.items.flatMap((line) => line.events.map((event) => event.quantity)),
		);

		// Bought: 3 and 1 before the split (now 30 and 10), then 15 matched as 5 + 10.
		// Sold: 45 matched as 30 + 10 + 5, then 10.
		expect(quantities).toEqual([30, 10, 5, 10, -30, -10, -5, -10]);
	});
});
