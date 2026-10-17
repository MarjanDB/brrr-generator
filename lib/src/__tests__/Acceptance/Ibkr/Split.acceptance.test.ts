import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
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
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxPayer: Fixtures.taxPayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});
		const expected = split.expectedReport("slovenia/2024/kdvp-fifo");

		await expect(report.xml).toMatchFileSnapshot(expected.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(expected.csvPath);
	});

	test("the shares bought before the split count ten times over", () => {
		// The provider applies the split before generating; do the same here.
		const splitApplied = new ApplyIdentifierRelationshipsService().apply(events, [
			IdentifierChangeType.SPLIT,
		]);
		const generator = new KdvpReportGenerator(Scenario.pipeline.eventsProcessor());
		const items = generator.convert(
			Scenario.config.report(2024, TaxAuthorityLotMatchingMethod.FIFO),
			splitApplied.groupings,
		);
		const kdvpEvents = items.flatMap((item) => item.items.flatMap((line) => line.events));

		expect(kdvpEvents.length).toEqual(8);
		// Bought 3 before the split, now 30.
		expect(kdvpEvents[0].quantity).toEqual(30);
		// Bought 1 before the split, now 10.
		expect(kdvpEvents[1].quantity).toEqual(10);
		// Bought 15 after the split, matched as 5 and 10.
		expect(kdvpEvents[2].quantity).toEqual(5);
		expect(kdvpEvents[3].quantity).toEqual(10);
		// Sold 45, matched as 30, 10 and 5.
		expect(kdvpEvents[4].quantity).toEqual(-30);
		expect(kdvpEvents[5].quantity).toEqual(-10);
		expect(kdvpEvents[6].quantity).toEqual(-5);
		// Sold 10.
		expect(kdvpEvents[7].quantity).toEqual(-10);
	});
});
