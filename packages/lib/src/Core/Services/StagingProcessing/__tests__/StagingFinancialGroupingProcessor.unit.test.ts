import { Scenario } from "@brrr/__tests__/support/Scenario";
import { DividendType } from "@brrr/Core/Models/Events/DividendType";
import { IdentifierChangeType } from "@brrr/Core/Models/IdentifierRelationships/IdentifierChangeType";
import {
	CashActionId,
	CashTransactionId,
	CurrencyCode,
	Isin,
	ListingExchange,
	TaxLotId,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Models/Identifiers";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import { StagingIdentifierRelationship } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationship";
import { StagingIdentifierRelationships } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationships";
import { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";
import { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import { IdentifierRelationshipResolution } from "@brrr/Core/Services/StagingProcessing/IdentifierRelationshipResolution";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/Services/StagingProcessing/StagingFinancialGroupingProcessor";

const { build } = Scenario;
const { staging } = build;

const ident = new StagingFinancialIdentifier({
	isin: Isin.Schema.parse("US123"),
	ticker: Ticker.Schema.parse("AAPL"),
	name: "AAPL",
});

const simpleStagingStockBuy = staging.stockBought({
	id: TradeEventId.Schema.parse("StockBought"),
	identifier: ident,
	date: "2023-01-01",
	quantity: 1,
	price: 10,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingStockSold = staging.stockSold({
	id: TradeEventId.Schema.parse("StockSold"),
	identifier: ident,
	date: "2023-01-02",
	quantity: -1,
	price: 15,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDividend = staging.dividend({
	id: TradeEventId.Schema.parse("Dividend"),
	identifier: ident,
	date: "2023-01-01",
	amount: 10,
	actionId: CashActionId.Schema.parse("ActionID"),
	transactionId: CashTransactionId.Schema.parse("TransactionID"),
	listingExchange: ListingExchange.Schema.parse("ListingExchange"),
	dividendType: DividendType.ORDINARY,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDividendWithholdingTax = staging.withholdingTax({
	id: TradeEventId.Schema.parse("DividendWithholdingTax"),
	identifier: ident,
	date: "2023-01-01",
	amount: -5,
	actionId: CashActionId.Schema.parse("ActionID"),
	transactionId: CashTransactionId.Schema.parse("TransactionID"),
	listingExchange: ListingExchange.Schema.parse("ListingExchange"),
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingPaymentInLieuOfDividend = staging.paymentInLieu({
	id: TradeEventId.Schema.parse("PaymentInLieuOfDividend"),
	identifier: ident,
	date: "2023-01-01",
	amount: 5,
	actionId: CashActionId.Schema.parse("ActionID"),
	transactionId: CashTransactionId.Schema.parse("TransactionID"),
	listingExchange: ListingExchange.Schema.parse("ListingExchange"),
	dividendType: DividendType.ORDINARY,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingPaymentInLieuOfDividendWithholdingTax = staging.paymentInLieuWithholdingTax({
	id: TradeEventId.Schema.parse("PaymentInLieuOfDividendWithholdingTax"),
	identifier: ident,
	date: "2023-01-01",
	amount: -2.5,
	actionId: CashActionId.Schema.parse("ActionID"),
	transactionId: CashTransactionId.Schema.parse("TransactionID"),
	listingExchange: ListingExchange.Schema.parse("ListingExchange"),
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingStockLot = staging.taxLot({
	id: TaxLotId.Schema.parse("Lot"),
	identifier: ident,
	quantity: 1,
	shortLongType: ShortLong.LONG,
	acquired: { id: TradeEventId.Schema.parse("StockBought"), date: null },
	sold: { id: null, date: "2023-01-02" },
});

const simpleStagingDerivativeBuy = staging.optionBought({
	id: TradeEventId.Schema.parse("DerivativeBought"),
	identifier: ident,
	date: "2023-01-01",
	multiplier: 100,
	quantity: 1,
	price: 10,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDerivativeSold = staging.optionSold({
	id: TradeEventId.Schema.parse("DerivativeSold"),
	identifier: ident,
	date: "2023-01-02",
	multiplier: 1,
	quantity: -1,
	price: 15,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDerivativeLot = staging.taxLot({
	id: TaxLotId.Schema.parse("Lot"),
	identifier: ident,
	quantity: 1,
	shortLongType: ShortLong.LONG,
	acquired: { id: TradeEventId.Schema.parse("DerivativeBought"), date: null },
	sold: { id: null, date: "2023-01-02" },
});

test("simple stock lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [simpleStagingStockBuy, simpleStagingStockSold],
			stockTaxLots: [simpleStagingStockLot],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [],
		}),
	];
	const results = processor.generateGenericGroupings(groupings);
	expect(results.length).toEqual(1);
	expect(results[0].stockTaxLots[0].acquired).toEqual(results[0].stockTrades[0]);
	expect(results[0].stockTaxLots[0].acquired.exchangedMoney.quantity).toEqual(1);
	expect(results[0].stockTaxLots[0].sold).toEqual(results[0].stockTrades[1]);
	expect(results[0].stockTaxLots[0].sold.exchangedMoney.quantity).toEqual(-1);
});

test("partial stock lot matching throws", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [simpleStagingStockBuy],
			stockTaxLots: [simpleStagingStockLot],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [],
		}),
	];
	expect(() => processor.generateGenericGroupings(groupings)).toThrow(Error);
});

test("throws when a stock lot has no sold date", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const lotWithoutSoldDate = staging.taxLot({
		id: TaxLotId.Schema.parse("Lot"),
		identifier: ident,
		quantity: 1,
		shortLongType: ShortLong.LONG,
		acquired: { id: TradeEventId.Schema.parse("StockBought"), date: null },
		sold: { id: null, date: null },
	});
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [simpleStagingStockBuy, simpleStagingStockSold],
			stockTaxLots: [lotWithoutSoldDate],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [],
		}),
	];

	expect(() => processor.generateGenericGroupings(groupings)).toThrow(
		"LookupError: Failed to match stock lot",
	);
});

test("simple derivative lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [],
			stockTaxLots: [],
			derivativeTrades: [simpleStagingDerivativeBuy, simpleStagingDerivativeSold],
			derivativeTaxLots: [simpleStagingDerivativeLot],
			cashTransactions: [],
		}),
	];
	const results = processor.generateGenericGroupings(groupings);
	expect(results.length).toEqual(1);
	expect(results[0].derivativeGroupings[0].derivativeTaxLots[0].acquired).toEqual(
		results[0].derivativeGroupings[0].derivativeTrades[0],
	);
	expect(
		results[0].derivativeGroupings[0].derivativeTaxLots[0].acquired.exchangedMoney.quantity,
	).toEqual(1);
	expect(results[0].derivativeGroupings[0].derivativeTaxLots[0].sold).toEqual(
		results[0].derivativeGroupings[0].derivativeTrades[1],
	);
	expect(
		results[0].derivativeGroupings[0].derivativeTaxLots[0].sold.exchangedMoney.quantity,
	).toEqual(-1);
});

test("dividend with withholding tax", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [],
			stockTaxLots: [],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [simpleStagingDividend, simpleStagingDividendWithholdingTax],
		}),
	];
	const results = processor.generateGenericGroupings(groupings);
	expect(results.length).toEqual(1);
	expect(results[0].cashTransactions[0].id).toEqual(simpleStagingDividend.id);
	expect(results[0].cashTransactions[1].id).toEqual(simpleStagingDividendWithholdingTax.id);
	expect(results[0].cashTransactions[0].exchangedMoney.quantity).toEqual(1);
	expect(results[0].cashTransactions[1].exchangedMoney.quantity).toEqual(1);
	expect(results[0].cashTransactions[0].exchangedMoney.priceInBase).toEqual(10);
	expect(results[0].cashTransactions[1].exchangedMoney.priceInBase).toEqual(-5);
});

test("payment in lieu of dividend with withholding tax", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [],
			stockTaxLots: [],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [
				simpleStagingPaymentInLieuOfDividend,
				simpleStagingPaymentInLieuOfDividendWithholdingTax,
			],
		}),
	];
	const results = processor.generateGenericGroupings(groupings);
	expect(results.length).toEqual(1);
	expect(results[0].cashTransactions[0].id).toEqual(simpleStagingPaymentInLieuOfDividend.id);
	expect(results[0].cashTransactions[1].id).toEqual(
		simpleStagingPaymentInLieuOfDividendWithholdingTax.id,
	);
	expect(results[0].cashTransactions[0].exchangedMoney.quantity).toEqual(1);
	expect(results[0].cashTransactions[1].exchangedMoney.quantity).toEqual(1);
	expect(results[0].cashTransactions[0].exchangedMoney.priceInBase).toEqual(5);
	expect(results[0].cashTransactions[1].exchangedMoney.priceInBase).toEqual(-2.5);
});

test("processStagingFinancialEvents returns FinancialEvents with converted relationships", () => {
	const stagingIdA = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const stagingIdB = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const stagingRel = new StagingIdentifierRelationship({
		fromIdentifier: stagingIdA,
		toIdentifier: stagingIdB,
		changeType: StagingIdentifierChangeType.RENAME,
		effectiveDate: build.date("2024-06-01"),
	});
	const relationships = new StagingIdentifierRelationships({
		relationships: [stagingRel],
		partialRelationships: [],
	});
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const result = processor.processStagingFinancialEvents(
		new StagingFinancialEvents({
			groupings: [
				staging.grouping({
					identifier: stagingIdA,
					countryOfOrigin: null,
					category: Category.REGULAR,
					stockTrades: [],
					stockTaxLots: [],
					derivativeTrades: [],
					derivativeTaxLots: [],
					cashTransactions: [],
				}),
			],
			identifierRelationships: relationships,
		}),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isin).toEqual("US111");
	expect(result.identifierRelationships.length).toEqual(1);
	expect(result.identifierRelationships[0].fromIdentifier.isin).toEqual("US111");
	expect(result.identifierRelationships[0].toIdentifier.isin).toEqual("US222");
	expect(result.identifierRelationships[0].changeType).toEqual(IdentifierChangeType.RENAME);
});
