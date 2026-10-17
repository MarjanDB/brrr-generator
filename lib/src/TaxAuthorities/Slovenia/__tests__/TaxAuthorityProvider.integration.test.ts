import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";

const { build, config, pipeline } = Scenario;

function makeProvider({
	apply = new ApplyIdentifierRelationshipsService(),
	info = new PredefinedInfoProvider(),
}: {
	apply?: ApplyIdentifierRelationshipsService;
	info?: PredefinedInfoProvider;
} = {}): SlovenianTaxAuthorityProvider {
	const processor = pipeline.eventsProcessor();
	return new SlovenianTaxAuthorityProvider(
		apply,
		new KdvpReportGenerator(processor),
		new DivReportGenerator(info),
		new IfiReportGenerator(processor),
	);
}

const stockBought = build.stockBought({ date: "2023-06-06" });
const stockSold = build.stockSold({ date: "2023-06-07" });
const optionBought = build.derivativeBought({ date: "2023-06-07", multiplier: 100 });
const optionSold = build.derivativeSold({ date: "2023-06-08", multiplier: 100, price: 1.5 });

const testData = build.events([
	build.grouping({
		stockTrades: [stockBought, stockSold],
		stockTaxLots: [build.taxLot({ acquired: stockBought, sold: stockSold })],
		derivativeGroupings: [
			build.derivativeGrouping({
				trades: [optionBought, optionSold],
				taxLots: [build.taxLot({ acquired: optionBought, sold: optionSold })],
			}),
		],
		cashTransactions: [
			build.dividend({ date: "2023-06-07", amount: 10, money: { fxRateToBase: 0.5 } }),
			build.withholdingTax({ date: "2023-06-07", amount: -5, money: { fxRateToBase: 0.5 } }),
		],
	}),
]);

test("KDVP lines: the buy and the sale with their quantities", () => {
	const items = new KdvpReportGenerator(pipeline.eventsProcessor()).convert(
		config.report(2023),
		testData.groupings,
	);
	const events = items.flatMap((item) => item.items.flatMap((line) => line.events));

	expect(events.map((event) => event.quantity)).toEqual([1, -1]);
});

test("IFI lines: the buy and the sale with their quantities", () => {
	const items = new IfiReportGenerator(pipeline.eventsProcessor()).convert(
		config.report(2023),
		testData.groupings,
	);
	const rows = items.flatMap((item) => item.items);

	expect(rows.map((row) => row.quantity)).toEqual([1, -1]);
});

test("DIV lines: the dividend with its withholding tax", async () => {
	const generator = new DivReportGenerator(new PredefinedInfoProvider());
	const rows = await generator.convert(
		config.report(2023, TaxAuthorityLotMatchingMethod.NONE),
		testData.groupings,
	);

	expect(rows.length).toEqual(1);
	expect(rows[0].dividendAmount).toEqual(10.0);
	expect(rows[0].foreignTaxPaid).toEqual(5.0);
	expect(rows[0].dividendAmountInOriginalCurrency).toEqual(20);
	expect(rows[0].foreignTaxPaidInOriginalCurrency).toEqual(10.0);
});

test("generate applies identifier relationships once", async () => {
	const apply = new ApplyIdentifierRelationshipsService();
	const applySpy = vi.spyOn(apply, "apply");
	const provider = makeProvider({ apply });

	await provider.generate(SlovenianTaxAuthorityReportTypes.DOH_KDVP, {
		taxPayerInfo: config.taxPayer,
		reportConfig: config.report(2023),
		events: testData,
	});

	expect(applySpy).toHaveBeenCalledTimes(1);
});

test("DIV looks each company up once", async () => {
	const info = new PredefinedInfoProvider();
	const lookupSpy = vi.spyOn(info, "getCompanyInfo");
	const provider = makeProvider({ info });

	await provider.generate(SlovenianTaxAuthorityReportTypes.DOH_DIV, {
		taxPayerInfo: config.taxPayer,
		reportConfig: config.report(2023),
		events: testData,
	});

	expect(lookupSpy).toHaveBeenCalledTimes(1);
});

test("unknown report type id is rejected", async () => {
	const provider = makeProvider();

	await expect(
		provider.generateExports("nope", {
			taxPayerInfo: config.taxPayer,
			reportConfig: config.report(2023),
			events: testData,
		}),
	).rejects.toThrow("Unsupported report type 'nope' for tax authority: slovenia");
});
