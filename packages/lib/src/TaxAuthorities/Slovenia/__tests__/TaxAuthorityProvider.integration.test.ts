import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { Category, GenericDividendType, ShortLong } from "@brrr/Core/Schemas/CommonFormats";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import {
	CashActionId,
	CashTransactionId,
	CurrencyCode,
	Isin,
	ListingExchange,
	TaxLotId,
	TradeEventId,
} from "@brrr/Core/Schemas/Identifiers";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";
import { ReportTypeId } from "@brrr/TaxAuthorities/TaxAuthorityIdentifiers";

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

const stockBought = build.stockBought({
	id: TradeEventId.Schema.parse("ID1"),
	date: "2023-06-06",
	quantity: 1,
	price: 1,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const stockSold = build.stockSold({
	id: TradeEventId.Schema.parse("ID2"),
	date: "2023-06-07",
	quantity: -1,
	price: 1,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const optionBought = build.optionBought({
	id: TradeEventId.Schema.parse("ID1"),
	date: "2023-06-07",
	multiplier: 100,
	quantity: 1,
	price: 1,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const optionSold = build.optionSold({
	id: TradeEventId.Schema.parse("ID2"),
	date: "2023-06-08",
	multiplier: 100,
	quantity: -1,
	price: 1.5,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const dividend = build.dividend({
	id: TradeEventId.Schema.parse("ID"),
	date: "2023-06-07",
	amount: 10,
	actionId: CashActionId.Schema.parse("DivAction"),
	transactionId: CashTransactionId.Schema.parse("TranId1"),
	listingExchange: ListingExchange.Schema.parse("EXH"),
	dividendType: GenericDividendType.ORDINARY,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 0.5,
});

const withholdingTax = build.withholdingTax({
	id: TradeEventId.Schema.parse("ID"),
	date: "2023-06-07",
	amount: -5,
	actionId: CashActionId.Schema.parse("DivAction"),
	transactionId: CashTransactionId.Schema.parse("TranId1"),
	listingExchange: ListingExchange.Schema.parse("EXH"),
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 0.5,
});

const testData = build.events(
	[
		build.grouping({
			identifier: new FinancialIdentifier({ isin: Isin.Schema.parse("ISIN") }),
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [stockBought, stockSold],
			stockTaxLots: [
				build.stockTaxLot({
					id: TaxLotId.Schema.parse("ID1"),
					quantity: 1,
					shortLongType: ShortLong.LONG,
					acquired: stockBought,
					sold: stockSold,
				}),
			],
			derivativeGroupings: [
				build.derivativeGrouping({
					identifier: new FinancialIdentifier({ isin: Isin.Schema.parse("ISIN") }),
					trades: [optionBought, optionSold],
					taxLots: [
						build.derivativeTaxLot({
							id: TaxLotId.Schema.parse("ID1"),
							quantity: 1,
							shortLongType: ShortLong.LONG,
							acquired: optionBought,
							sold: optionSold,
						}),
					],
				}),
			],
			cashTransactions: [dividend, withholdingTax],
		}),
	],
	[],
);

test("KDVP lines: the buy and the sale with their quantities", () => {
	const items = new KdvpReportGenerator(pipeline.eventsProcessor()).convert(
		config.report(2023, TaxAuthorityLotMatchingMethod.FIFO),
		testData.groupings,
	);
	const events = items.flatMap((item) => item.items.flatMap((line) => line.events));

	expect(events.length).toEqual(2);
	expect(events[0].quantity).toEqual(1);
	expect(events[1].quantity).toEqual(-1);
});

test("IFI lines: the buy and the sale with their quantities", () => {
	const items = new IfiReportGenerator(pipeline.eventsProcessor()).convert(
		config.report(2023, TaxAuthorityLotMatchingMethod.FIFO),
		testData.groupings,
	);
	const rows = items.flatMap((item) => item.items);

	expect(rows.length).toEqual(2);
	expect(rows[0].quantity).toEqual(1);
	expect(rows[1].quantity).toEqual(-1);
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
		taxpayerInfo: Fixtures.taxpayer,
		reportConfig: config.report(2023, TaxAuthorityLotMatchingMethod.FIFO),
		events: testData,
	});

	expect(applySpy).toHaveBeenCalledTimes(1);
});

test("DIV looks each company up once", async () => {
	const info = new PredefinedInfoProvider();
	const lookupSpy = vi.spyOn(info, "getCompanyInfo");
	const provider = makeProvider({ info });

	await provider.generate(SlovenianTaxAuthorityReportTypes.DOH_DIV, {
		taxpayerInfo: Fixtures.taxpayer,
		reportConfig: config.report(2023, TaxAuthorityLotMatchingMethod.FIFO),
		events: testData,
	});

	expect(lookupSpy).toHaveBeenCalledTimes(1);
});

test("unknown report type id is rejected", async () => {
	const provider = makeProvider();

	await expect(
		provider.generateExports(ReportTypeId.Schema.parse("nope"), {
			taxpayerInfo: Fixtures.taxpayer,
			reportConfig: config.report(2023, TaxAuthorityLotMatchingMethod.FIFO),
			events: testData,
		}),
	).rejects.toThrow("Unsupported report type 'nope' for tax authority: slovenia");
});
