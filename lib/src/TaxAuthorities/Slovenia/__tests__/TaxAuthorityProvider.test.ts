import { makeDate, makeMoney } from "@brrr/__tests__/support/Builders";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
} from "@brrr/Core/Schemas/Events";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import { TaxLot } from "@brrr/Core/Schemas/Lots";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import type {
	TaxAuthorityConfiguration,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import {
	TaxAuthorityLotMatchingMethod,
	TaxPayerType,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";

function makeProvider({
	apply = new ApplyIdentifierRelationshipsService(),
	info = new PredefinedInfoProvider(),
}: {
	apply?: ApplyIdentifierRelationshipsService;
	info?: PredefinedInfoProvider;
} = {}): SlovenianTaxAuthorityProvider {
	const processor = new FinancialEventsProcessor(new LotMatcher());
	return new SlovenianTaxAuthorityProvider(
		apply,
		new KdvpReportGenerator(processor),
		new DivReportGenerator(info),
		new IfiReportGenerator(processor),
	);
}

const simpleTaxPayer: TaxPayerInfo = {
	taxNumber: "taxNumber",
	taxpayerType: TaxPayerType.PHYSICAL_SUBJECT,
	name: "name",
	address1: "address1",
	address2: "address2",
	city: "city",
	postNumber: "postNumber",
	postName: "postName",
	municipalityName: "municipality",
	birthDate: makeDate("2000-01-01"),
	maticnaStevilka: "maticna",
	invalidskoPodjetje: false,
	resident: true,
	activityCode: "",
	activityName: "",
	countryId: "SI",
	countryName: "Slovenia",
};

const stockAcquired = new TradeEventStockAcquired({
	id: "ID1",
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-06-06"),
	multiplier: 1.0,
	exchangedMoney: makeMoney({}),
	acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	provenance: [],
});

const stockSold = new TradeEventStockSold({
	id: "ID2",
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-06-07"),
	multiplier: 1.0,
	exchangedMoney: makeMoney({ underlyingQuantity: -1.0 }),
	provenance: [],
});

const optionBought = new TradeEventDerivativeAcquired({
	id: "ID1",
	acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
	assetClass: GenericAssetClass.OPTION,
	date: makeDate("2023-06-07"),
	multiplier: 100,
	exchangedMoney: makeMoney({}),
	provenance: [],
});

const optionSold = new TradeEventDerivativeSold({
	id: "ID2",
	assetClass: GenericAssetClass.OPTION,
	date: makeDate("2023-06-08"),
	multiplier: 100,
	exchangedMoney: makeMoney({ underlyingQuantity: -1.0, underlyingTradePrice: 1.5 }),
	provenance: [],
});

const cashTransactionDividend = new TradeEventCashTransactionDividend({
	id: "ID",
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-06-07"),
	multiplier: 1,
	exchangedMoney: makeMoney({ underlyingTradePrice: 10.0, fxRateToBase: 0.5 }),
	actionId: "DivAction",
	transactionId: "TranId1",
	listingExchange: "EXH",
	dividendType: GenericDividendType.ORDINARY,
	provenance: [],
});

const cashTransactionWithholdingTax = new TradeEventCashTransactionWithholdingTax({
	id: "ID",
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-06-07"),
	multiplier: 1,
	exchangedMoney: makeMoney({ underlyingTradePrice: -5.0, fxRateToBase: 0.5 }),
	actionId: "DivAction",
	transactionId: "TranId1",
	listingExchange: "EXH",
	provenance: [],
});

const stockLot = new TaxLot({
	id: "ID1",
	quantity: 1.0,
	acquired: stockAcquired,
	sold: stockSold,
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

const derivativeLot = new TaxLot({
	id: "ID1",
	quantity: 1.0,
	acquired: optionBought,
	sold: optionSold,
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

const derivativeGrouping = new DerivativeGrouping({
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	derivativeTrades: [optionBought, optionSold],
	derivativeTaxLots: [derivativeLot],
	provenance: [],
});

const testGrouping = new FinancialGrouping({
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	countryOfOrigin: null,
	underlyingCategory: GenericCategory.REGULAR,
	stockTrades: [stockAcquired, stockSold],
	stockTaxLots: [stockLot],
	derivativeGroupings: [derivativeGrouping],
	cashTransactions: [cashTransactionDividend, cashTransactionWithholdingTax],
	provenance: [],
});

const testData = new FinancialEvents({
	groupings: [testGrouping],
	identifierRelationships: [],
});

test("KDVP lines: the buy and the sale with their quantities", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const processor = new FinancialEventsProcessor(new LotMatcher());
	const generator = new KdvpReportGenerator(processor);
	const items = generator.convert(config, testData.groupings);
	const events = items.flatMap((item) => item.items.flatMap((line) => line.events));

	expect(events.length).toEqual(2);
	expect(events[0].quantity).toEqual(1);
	expect(events[1].quantity).toEqual(-1);
});

test("KDVP XML: 1 purchase and 1 sale", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider();
	const { xml } = await provider.generate(SlovenianTaxAuthorityReportTypes.DOH_KDVP, {
		taxPayerInfo: simpleTaxPayer,
		reportConfig: config,
		events: testData,
	});

	const purchaseCount = (xml.match(/<Purchase>/g) ?? []).length;
	const saleCount = (xml.match(/<Sale>/g) ?? []).length;

	expect(purchaseCount).toEqual(1);
	expect(saleCount).toEqual(1);
});

test("IFI lines: the buy and the sale with their quantities", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const processor = new FinancialEventsProcessor(new LotMatcher());
	const generator = new IfiReportGenerator(processor);
	const items = generator.convert(config, testData.groupings);
	const rows = items.flatMap((item) => item.items);

	expect(rows.length).toEqual(2);
	expect(rows[0].quantity).toEqual(1);
	expect(rows[1].quantity).toEqual(-1);
});

test("IFI XML: 1 purchase and 1 sale", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider();
	const { xml } = await provider.generate(SlovenianTaxAuthorityReportTypes.D_IFI, {
		taxPayerInfo: simpleTaxPayer,
		reportConfig: config,
		events: testData,
	});

	const purchaseCount = (xml.match(/<Purchase>/g) ?? []).length;
	const saleCount = (xml.match(/<Sale>/g) ?? []).length;

	expect(purchaseCount).toEqual(1);
	expect(saleCount).toEqual(1);
});

test("DIV lines: the dividend with its withholding tax", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
	};

	const generator = new DivReportGenerator(new PredefinedInfoProvider());
	const rows = await generator.convert(config, testData.groupings);

	expect(rows.length).toEqual(1);
	expect(rows[0].dividendAmount).toEqual(10.0);
	expect(rows[0].foreignTaxPaid).toEqual(5.0);
	expect(rows[0].dividendAmountInOriginalCurrency).toEqual(20);
	expect(rows[0].foreignTaxPaidInOriginalCurrency).toEqual(10.0);
});

test("DIV XML: 1 dividend", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
	};

	const provider = makeProvider();
	const { xml } = await provider.generate(SlovenianTaxAuthorityReportTypes.DOH_DIV, {
		taxPayerInfo: simpleTaxPayer,
		reportConfig: config,
		events: testData,
	});

	const dividendCount = (xml.match(/<Dividend>/g) ?? []).length;
	expect(dividendCount).toEqual(1);
});

const reportConfig2023: TaxAuthorityConfiguration = {
	fromDate: makeDate("2023-01-01"),
	toDate: makeDate("2024-01-01"),
	lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
};

test("generate applies identifier relationships once", async () => {
	const apply = new ApplyIdentifierRelationshipsService();
	const applySpy = vi.spyOn(apply, "apply");
	const provider = makeProvider({ apply });

	await provider.generate(SlovenianTaxAuthorityReportTypes.DOH_KDVP, {
		taxPayerInfo: simpleTaxPayer,
		reportConfig: reportConfig2023,
		events: testData,
	});

	expect(applySpy).toHaveBeenCalledTimes(1);
});

test("DIV looks each company up once", async () => {
	const info = new PredefinedInfoProvider();
	const lookupSpy = vi.spyOn(info, "getCompanyInfo");
	const provider = makeProvider({ info });

	await provider.generate(SlovenianTaxAuthorityReportTypes.DOH_DIV, {
		taxPayerInfo: simpleTaxPayer,
		reportConfig: reportConfig2023,
		events: testData,
	});

	expect(lookupSpy).toHaveBeenCalledTimes(1);
});

test("unknown report type id is rejected", async () => {
	const provider = makeProvider();

	await expect(
		provider.generateExports("nope", {
			taxPayerInfo: simpleTaxPayer,
			reportConfig: reportConfig2023,
			events: testData,
		}),
	).rejects.toThrow("Unsupported report type 'nope' for tax authority: slovenia");
});
