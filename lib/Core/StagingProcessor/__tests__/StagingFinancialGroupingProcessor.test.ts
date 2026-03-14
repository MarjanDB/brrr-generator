import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship.ts";
import {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	StagingTradeEventCashTransactionWithholdingTax,
	StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends,
	StagingTradeEventDerivativeAcquired,
	StagingTradeEventDerivativeSold,
	StagingTradeEventStockAcquired,
	StagingTradeEventStockSold,
} from "@brrr/Core/Schemas/Staging/Events.ts";
import { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping.ts";
import {
	StagingIdentifierChangeType,
	StagingIdentifierRelationship,
	StagingIdentifierRelationships,
} from "@brrr/Core/Schemas/Staging/IdentifierRelationship.ts";
import { StagingTaxLot, StagingTaxLotMatchingDetails } from "@brrr/Core/Schemas/Staging/Lots.ts";
import { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents.ts";
import { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier.ts";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor.ts";
import { DateTime } from "luxon";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";

function makeDate(iso: string): ValidDateTime {
	return DateTime.fromISO(iso) as ValidDateTime;
}

const ident = new StagingFinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "AAPL" });

function makeMonetary(qty: number, price: number) {
	return new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: qty,
		underlyingTradePrice: price,
		comissionCurrency: "EUR",
		comissionTotal: 0,
		taxCurrency: "EUR",
		taxTotal: 0,
		fxRateToBase: 1,
	});
}

const simpleStagingStockBuy = new StagingTradeEventStockAcquired({
	id: "StockBought",
	financialIdentifier: ident,
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-01-01"),
	multiplier: 1,
	acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	exchangedMoney: makeMonetary(1, 10),
});

const simpleStagingStockSold = new StagingTradeEventStockSold({
	id: "StockSold",
	financialIdentifier: ident,
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-01-02"),
	multiplier: 1,
	exchangedMoney: makeMonetary(-1, 15),
});

const simpleStagingDividend = new StagingTradeEventCashTransactionDividend({
	id: "Dividend",
	financialIdentifier: ident,
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-01-01"),
	multiplier: 1,
	actionId: "ActionID",
	transactionId: "TransactionID",
	listingExchange: "ListingExchange",
	dividendType: GenericDividendType.ORDINARY,
	exchangedMoney: makeMonetary(1, 10),
});

const simpleStagingDividendWithholdingTax = new StagingTradeEventCashTransactionWithholdingTax({
	id: "DividendWithholdingTax",
	financialIdentifier: ident,
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-01-01"),
	multiplier: 1,
	actionId: "ActionID",
	transactionId: "TransactionID",
	listingExchange: "ListingExchange",
	exchangedMoney: makeMonetary(1, -5),
});

const simpleStagingPaymentInLieuOfDividend = new StagingTradeEventCashTransactionPaymentInLieuOfDividends({
	id: "PaymentInLieuOfDividend",
	financialIdentifier: ident,
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-01-01"),
	multiplier: 1,
	actionId: "ActionID",
	transactionId: "TransactionID",
	listingExchange: "ListingExchange",
	dividendType: GenericDividendType.ORDINARY,
	exchangedMoney: makeMonetary(1, 5),
});

const simpleStagingPaymentInLieuOfDividendWithholdingTax = new StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends({
	id: "PaymentInLieuOfDividendWithholdingTax",
	financialIdentifier: ident,
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-01-01"),
	multiplier: 1,
	actionId: "ActionID",
	transactionId: "TransactionID",
	listingExchange: "ListingExchange",
	exchangedMoney: makeMonetary(1, -2.5),
});

const simpleStagingStockLot = new StagingTaxLot({
	id: "Lot",
	financialIdentifier: ident,
	quantity: 1,
	acquired: new StagingTaxLotMatchingDetails({ id: "StockBought", dateTime: null }),
	sold: new StagingTaxLotMatchingDetails({ id: null, dateTime: makeDate("2023-01-02") }),
	shortLongType: GenericShortLong.LONG,
});

const simpleStagingDerivativeBuy = new StagingTradeEventDerivativeAcquired({
	id: "DerivativeBought",
	financialIdentifier: ident,
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-01-01"),
	multiplier: 100,
	acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
	exchangedMoney: makeMonetary(1, 10),
});

const simpleStagingDerivativeSold = new StagingTradeEventDerivativeSold({
	id: "DerivativeSold",
	financialIdentifier: ident,
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-01-02"),
	multiplier: 1,
	exchangedMoney: makeMonetary(-1, 15),
});

const simpleStagingDerivativeLot = new StagingTaxLot({
	id: "Lot",
	financialIdentifier: ident,
	quantity: 1,
	acquired: new StagingTaxLotMatchingDetails({ id: "DerivativeBought", dateTime: null }),
	sold: new StagingTaxLotMatchingDetails({ id: null, dateTime: makeDate("2023-01-02") }),
	shortLongType: GenericShortLong.LONG,
});

function makeGrouping(overrides: Partial<ConstructorParameters<typeof StagingFinancialGrouping>[0]>): StagingFinancialGrouping {
	return new StagingFinancialGrouping({
		financialIdentifier: ident,
		countryOfOrigin: null,
		underlyingCategory: GenericCategory.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeTrades: [],
		derivativeTaxLots: [],
		cashTransactions: [],
		...overrides,
	});
}

test("simple stock lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor();
	const groupings = [
		makeGrouping({
			stockTrades: [simpleStagingStockBuy, simpleStagingStockSold],
			stockTaxLots: [simpleStagingStockLot],
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
	const processor = new StagingFinancialGroupingProcessor();
	const groupings = [
		makeGrouping({
			stockTrades: [simpleStagingStockBuy],
			stockTaxLots: [simpleStagingStockLot],
		}),
	];
	expect(() => processor.generateGenericGroupings(groupings)).toThrow(Error);
});

test("simple derivative lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor();
	const groupings = [
		makeGrouping({
			derivativeTrades: [simpleStagingDerivativeBuy, simpleStagingDerivativeSold],
			derivativeTaxLots: [simpleStagingDerivativeLot],
		}),
	];
	const results = processor.generateGenericGroupings(groupings);
	expect(results.length).toEqual(1);
	expect(
		results[0].derivativeGroupings[0].derivativeTaxLots[0].acquired,
	).toEqual(results[0].derivativeGroupings[0].derivativeTrades[0]);
	expect(results[0].derivativeGroupings[0].derivativeTaxLots[0].acquired.exchangedMoney.underlyingQuantity).toEqual(1);
	expect(
		results[0].derivativeGroupings[0].derivativeTaxLots[0].sold,
	).toEqual(results[0].derivativeGroupings[0].derivativeTrades[1]);
	expect(results[0].derivativeGroupings[0].derivativeTaxLots[0].sold.exchangedMoney.underlyingQuantity).toEqual(-1);
});

test("dividend with withholding tax", () => {
	const processor = new StagingFinancialGroupingProcessor();
	const groupings = [
		makeGrouping({
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
	const processor = new StagingFinancialGroupingProcessor();
	const groupings = [
		makeGrouping({
			cashTransactions: [
				simpleStagingPaymentInLieuOfDividend,
				simpleStagingPaymentInLieuOfDividendWithholdingTax,
			],
		}),
	];
	const results = processor.generateGenericGroupings(groupings);
	expect(results.length).toEqual(1);
	expect(results[0].cashTransactions[0].id).toEqual(simpleStagingPaymentInLieuOfDividend.id);
	expect(results[0].cashTransactions[1].id).toEqual(simpleStagingPaymentInLieuOfDividendWithholdingTax.id);
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
		effectiveDate: makeDate("2024-06-01"),
	});
	const relationships = new StagingIdentifierRelationships({
		relationships: [stagingRel],
		partialRelationships: [],
	});
	const processor = new StagingFinancialGroupingProcessor();
	const result = processor.processStagingFinancialEvents(
		new StagingFinancialEvents({
			groupings: [makeGrouping({ financialIdentifier: stagingIdA })],
			identifierRelationships: relationships,
		}),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.getIsin()).toEqual("US111");
	expect(result.identifierRelationships.length).toEqual(1);
	expect(result.identifierRelationships[0].fromIdentifier.getIsin()).toEqual("US111");
	expect(result.identifierRelationships[0].toIdentifier.getIsin()).toEqual("US222");
	expect(result.identifierRelationships[0].changeType).toEqual(IdentifierChangeType.RENAME);
});
