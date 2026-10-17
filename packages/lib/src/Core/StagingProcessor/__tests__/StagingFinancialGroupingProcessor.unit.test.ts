import { Scenario } from "@brrr/__tests__/support/Scenario";
import {
	GenericCategory,
	GenericDividendType,
	GenericShortLong,
} from "@brrr/Core/Schemas/CommonFormats";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import {
	StagingIdentifierChangeType,
	StagingIdentifierRelationship,
	StagingIdentifierRelationships,
} from "@brrr/Core/Schemas/Staging/IdentifierRelationship";
import { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";
import { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";
import { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor";

const { build } = Scenario;
const { staging } = build;

const ident = new StagingFinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "AAPL" });

const simpleStagingStockBuy = staging.stockBought({
	id: "StockBought",
	identifier: ident,
	date: "2023-01-01",
	quantity: 1,
	price: 10,
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingStockSold = staging.stockSold({
	id: "StockSold",
	identifier: ident,
	date: "2023-01-02",
	quantity: -1,
	price: 15,
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDividend = staging.dividend({
	id: "Dividend",
	identifier: ident,
	date: "2023-01-01",
	amount: 10,
	actionId: "ActionID",
	transactionId: "TransactionID",
	listingExchange: "ListingExchange",
	dividendType: GenericDividendType.ORDINARY,
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDividendWithholdingTax = staging.withholdingTax({
	id: "DividendWithholdingTax",
	identifier: ident,
	date: "2023-01-01",
	amount: -5,
	actionId: "ActionID",
	transactionId: "TransactionID",
	listingExchange: "ListingExchange",
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingPaymentInLieuOfDividend = staging.paymentInLieu({
	id: "PaymentInLieuOfDividend",
	identifier: ident,
	date: "2023-01-01",
	amount: 5,
	actionId: "ActionID",
	transactionId: "TransactionID",
	listingExchange: "ListingExchange",
	dividendType: GenericDividendType.ORDINARY,
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingPaymentInLieuOfDividendWithholdingTax = staging.paymentInLieuWithholdingTax({
	id: "PaymentInLieuOfDividendWithholdingTax",
	identifier: ident,
	date: "2023-01-01",
	amount: -2.5,
	actionId: "ActionID",
	transactionId: "TransactionID",
	listingExchange: "ListingExchange",
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingStockLot = staging.taxLot({
	id: "Lot",
	identifier: ident,
	quantity: 1,
	shortLongType: GenericShortLong.LONG,
	acquired: { id: "StockBought", date: null },
	sold: { id: null, date: "2023-01-02" },
});

const simpleStagingDerivativeBuy = staging.optionBought({
	id: "DerivativeBought",
	identifier: ident,
	date: "2023-01-01",
	multiplier: 100,
	quantity: 1,
	price: 10,
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDerivativeSold = staging.optionSold({
	id: "DerivativeSold",
	identifier: ident,
	date: "2023-01-02",
	multiplier: 1,
	quantity: -1,
	price: 15,
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDerivativeLot = staging.taxLot({
	id: "Lot",
	identifier: ident,
	quantity: 1,
	shortLongType: GenericShortLong.LONG,
	acquired: { id: "DerivativeBought", date: null },
	sold: { id: null, date: "2023-01-02" },
});

test("simple stock lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: GenericCategory.REGULAR,
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
	expect(results[0].stockTaxLots[0].acquired.exchangedMoney.underlyingQuantity).toEqual(1);
	expect(results[0].stockTaxLots[0].sold).toEqual(results[0].stockTrades[1]);
	expect(results[0].stockTaxLots[0].sold.exchangedMoney.underlyingQuantity).toEqual(-1);
});

test("partial stock lot matching throws", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: GenericCategory.REGULAR,
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
		id: "Lot",
		identifier: ident,
		quantity: 1,
		shortLongType: GenericShortLong.LONG,
		acquired: { id: "StockBought", date: null },
		sold: { id: null, date: null },
	});
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: GenericCategory.REGULAR,
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
			category: GenericCategory.REGULAR,
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
		results[0].derivativeGroupings[0].derivativeTaxLots[0].acquired.exchangedMoney
			.underlyingQuantity,
	).toEqual(1);
	expect(results[0].derivativeGroupings[0].derivativeTaxLots[0].sold).toEqual(
		results[0].derivativeGroupings[0].derivativeTrades[1],
	);
	expect(
		results[0].derivativeGroupings[0].derivativeTaxLots[0].sold.exchangedMoney.underlyingQuantity,
	).toEqual(-1);
});

test("dividend with withholding tax", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: GenericCategory.REGULAR,
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
	expect(results[0].cashTransactions[0].exchangedMoney.underlyingQuantity).toEqual(1);
	expect(results[0].cashTransactions[1].exchangedMoney.underlyingQuantity).toEqual(1);
	expect(results[0].cashTransactions[0].exchangedMoney.underlyingTradePrice).toEqual(10);
	expect(results[0].cashTransactions[1].exchangedMoney.underlyingTradePrice).toEqual(-5);
});

test("payment in lieu of dividend with withholding tax", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: GenericCategory.REGULAR,
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
	expect(results[0].cashTransactions[0].exchangedMoney.underlyingQuantity).toEqual(1);
	expect(results[0].cashTransactions[1].exchangedMoney.underlyingQuantity).toEqual(1);
	expect(results[0].cashTransactions[0].exchangedMoney.underlyingTradePrice).toEqual(5);
	expect(results[0].cashTransactions[1].exchangedMoney.underlyingTradePrice).toEqual(-2.5);
});

test("processStagingFinancialEvents returns FinancialEvents with converted relationships", () => {
	const stagingIdA = new StagingFinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const stagingIdB = new StagingFinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
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
					category: GenericCategory.REGULAR,
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
