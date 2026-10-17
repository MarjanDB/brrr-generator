import { Scenario } from "@brrr/__tests__/support/Scenario";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";

const { build, config } = Scenario;

const testData = build.events([
	build.grouping({
		cashTransactions: [
			build.dividend({ actionId: "DivAction", date: "2023-06-07", amount: 10.0 }),
			build.paymentInLieu({ actionId: "DivAction2", date: "2023-06-08", amount: 5.0 }),
			build.withholdingTax({ actionId: "DivAction", date: "2023-06-07", amount: -5.0 }),
			build.paymentInLieuWithholdingTax({
				actionId: "DivAction2",
				date: "2023-06-08",
				amount: -2.5,
			}),
		],
	}),
]);

test("PaymentInLieuOfDividend - withholding tax is reported separately from dividend withholding tax", async () => {
	const generator = new DivReportGenerator(new PredefinedInfoProvider());
	const rows = await generator.convert(
		config.report(2023, TaxAuthorityLotMatchingMethod.NONE),
		testData.groupings,
	);

	expect(rows.length).toEqual(2);

	expect(rows[0].dividendAmount).toEqual(10.0);
	expect(rows[0].foreignTaxPaid).toEqual(5.0);
	expect(rows[1].dividendAmount).toEqual(5.0);
	expect(rows[1].foreignTaxPaid).toEqual(2.5);
});
