import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { DividendType } from "@brrr/Core/Models/Events/DividendType";
import {
	CashActionId,
	CashTransactionId,
	CurrencyCode,
	Isin,
	ListingExchange,
	TaxLotId,
	TradeEventId,
} from "@brrr/Core/Models/Identifiers";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/Services/IdentifierRelationships/ApplyIdentifierRelationshipsService";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/Predefined/PredefinedInfoProvider";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";
import { ReportTypeId } from "@brrr/TaxAuthorities/Models/TaxAuthorityIdentifiers";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianReportTypeId";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianTaxAuthorityReportTypes";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/Services/Div/DivReportGenerator";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/Services/Ifi/IfiReportGenerator";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/Services/Kdvp/KdvpReportGenerator";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";
import { TestKit } from "@brrr/test-cases";

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
	dividendType: DividendType.ORDINARY,
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
		new NullProvenanceRecorder(),
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
		new NullProvenanceRecorder(),
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
		new NullProvenanceRecorder(),
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
		provenance: new NullProvenanceRecorder(),
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
		provenance: new NullProvenanceRecorder(),
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
			provenance: new NullProvenanceRecorder(),
		}),
	).rejects.toThrow("Unsupported report type 'nope' for tax authority: slovenia");
});

test("each KDVP line is recorded from its leg and its grouping (StockTrade, FIFO)", async () => {
	const stockTrade = TestKit.ibkr.stockTrade;
	const imported = Scenario.pipeline.run(stockTrade.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: stockTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	const walker = new ProvenanceWalker(report.provenance);
	const lines = report.provenance
		.nodes()
		.filter((node) => node.kind === ProvenanceNodeKind.REPORT_LINE);
	expect(lines).toHaveLength(2);
	expect(lines[0].label).toEqual("DOH_KDVP bought 2022-02-22 · 5 FR0010242511");
	expect(lines[1].label).toEqual("DOH_KDVP sold 2022-03-24 · -5 FR0010242511");
	const parents = walker.parents(lines[0]);
	expect(parents).toHaveLength(2);
	expect(parents[0].from.kind).toEqual(ProvenanceNodeKind.LEG);
	expect(parents[0].change).toEqual(ProvenanceChange.REPORTED);
	expect(parents[0].by).toEqual("KdvpReportGenerator");
	expect(parents[1].from.kind).toEqual(ProvenanceNodeKind.GROUPING);
});

test("IFI records its lines, and drops the broker's derivative lots as not used (OptionTrade, FIFO)", async () => {
	const optionTrade = TestKit.ibkr.optionTrade;
	const imported = Scenario.pipeline.run(optionTrade.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.IFI,
		year: optionTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	const walker = new ProvenanceWalker(report.provenance);
	const lines = report.provenance
		.nodes()
		.filter((node) => node.kind === ProvenanceNodeKind.REPORT_LINE);
	expect(lines).toHaveLength(2);
	expect(lines[0].label).toEqual("D_IFI bought 2023-12-14 · 1 AAPL  231222C00202500");
	expect(walker.parents(lines[0])[0].from.kind).toEqual(ProvenanceNodeKind.LEG);
	expect(walker.parents(lines[0])[1].from.kind).toEqual(ProvenanceNodeKind.GROUPING);
	const notUsed = report.provenance.drops().filter((drop) => drop.reason === DropReason.NOT_USED);
	expect(notUsed).toHaveLength(1);
	expect(notUsed[0].node.label).toEqual("lot 635331370 · 1 AAPL  231222C00202500");
	expect(notUsed[0].detail).toEqual("IFI matches derivative trades without the broker's lots");
});
