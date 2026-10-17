import { Scenario } from "@brrr/__tests__/support/Scenario";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import type { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping";
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
	price: 10,
});

const simpleStagingStockSold = staging.stockSold({
	id: "StockSold",
	identifier: ident,
	date: "2023-01-02",
	price: 15,
});

const cash = { identifier: ident, actionId: "ActionID", transactionId: "TransactionID" };

const simpleStagingDividend = staging.dividend({ ...cash, id: "Dividend", amount: 10 });

const simpleStagingDividendWithholdingTax = staging.withholdingTax({
	...cash,
	id: "DividendWithholdingTax",
	amount: -5,
});

const simpleStagingPaymentInLieuOfDividend = staging.paymentInLieu({
	...cash,
	id: "PaymentInLieuOfDividend",
	amount: 5,
});

const simpleStagingPaymentInLieuOfDividendWithholdingTax = staging.paymentInLieuWithholdingTax({
	...cash,
	id: "PaymentInLieuOfDividendWithholdingTax",
	amount: -2.5,
});

const simpleStagingStockLot = staging.taxLot({
	id: "Lot",
	identifier: ident,
	acquired: { id: "StockBought" },
	sold: { date: "2023-01-02" },
});

const simpleStagingDerivativeBuy = staging.derivativeBought({
	id: "DerivativeBought",
	identifier: ident,
	date: "2023-01-01",
	multiplier: 100,
	price: 10,
});

const simpleStagingDerivativeSold = staging.derivativeSold({
	id: "DerivativeSold",
	identifier: ident,
	date: "2023-01-02",
	price: 15,
});

const simpleStagingDerivativeLot = staging.taxLot({
	id: "Lot",
	identifier: ident,
	acquired: { id: "DerivativeBought" },
	sold: { date: "2023-01-02" },
});

function makeGrouping(options: Parameters<typeof staging.grouping>[0]): StagingFinancialGrouping {
	return staging.grouping({ identifier: ident, ...options });
}

test("simple stock lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
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
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		makeGrouping({
			stockTrades: [simpleStagingStockBuy],
			stockTaxLots: [simpleStagingStockLot],
		}),
	];
	expect(() => processor.generateGenericGroupings(groupings)).toThrow(Error);
});

test("throws when a stock lot has no sold date", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const lotWithoutSoldDate = staging.taxLot({
		id: "Lot",
		identifier: ident,
		acquired: { id: "StockBought" },
		sold: {},
	});
	const groupings = [
		makeGrouping({
			stockTrades: [simpleStagingStockBuy, simpleStagingStockSold],
			stockTaxLots: [lotWithoutSoldDate],
		}),
	];

	expect(() => processor.generateGenericGroupings(groupings)).toThrow(
		"LookupError: Failed to match stock lot",
	);
});

test("simple derivative lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		makeGrouping({
			derivativeTrades: [simpleStagingDerivativeBuy, simpleStagingDerivativeSold],
			derivativeTaxLots: [simpleStagingDerivativeLot],
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
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
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
			groupings: [makeGrouping({ identifier: stagingIdA })],
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
