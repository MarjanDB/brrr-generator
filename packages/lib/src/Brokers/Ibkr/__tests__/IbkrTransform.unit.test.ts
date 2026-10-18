import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import {
	IbkrIsin,
	IbkrSymbol,
	IbkrTransactionId,
} from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import {
	BuyOrSell,
	CashTransactionType,
	type CorporateAction,
	OpenCloseIndicator,
	type TradeStock,
	type TransactionCash,
} from "@brrr/Brokers/Ibkr/Schemas/IbkrSchemas";
import { IbkrTransformService } from "@brrr/Brokers/Ibkr/Transform";
import { CorrelationKey } from "@brrr/Core/Schemas/Identifiers";
import {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividend,
	StagingTradeEventCashTransactionWithholdingTax,
	StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
} from "@brrr/Core/Schemas/Staging/Events";
import { StagingIdentifierChangeType } from "@brrr/Core/Schemas/Staging/IdentifierRelationship";
import { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution";

const { ibkr } = Scenario.build;

const service = new IbkrTransformService();

const simpleTradeBuy = Fixtures.ibkr.stockTradeBuy;

const simpleTradeSell: TradeStock = {
	...Fixtures.ibkr.stockTradeBuy,
	quantity: -2,
	tradePrice: -15,
	tradeMoney: -30,
	netCash: 33,
	netCashInBase: 33,
	openCloseIndicator: OpenCloseIndicator.CLOSE,
	buyOrSell: BuyOrSell.SELL,
	transactionID: IbkrTransactionId.Schema.parse("ID2"),
};

const simpleStockLot = Fixtures.ibkr.stockLotClosed;

const dividend = Fixtures.ibkr.dividend;

const withholdingTaxForDividend: TransactionCash = {
	...Fixtures.ibkr.dividend,
	description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE - FR TAX",
	amount: -0.66,
	type: CashTransactionType.WITHHOLDING_TAX,
	transactionID: IbkrTransactionId.Schema.parse("323614082"),
};

const paymentInLieuOfDividend: TransactionCash = {
	...Fixtures.ibkr.dividend,
	description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE (Payment in Lieu of Dividends)",
	type: CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS,
};

const withholdingTaxForPaymentInLieu: TransactionCash = {
	...Fixtures.ibkr.dividend,
	description: "TTE(FR0000120271) PAYMENT IN LIEU OF DIVIDEND - FR TAX",
	amount: -0.66,
	type: CashTransactionType.WITHHOLDING_TAX,
	transactionID: IbkrTransactionId.Schema.parse("323614082"),
};

const corporateActionOld = Fixtures.ibkr.smciSplitOldRow;

const corporateActionNew: CorporateAction = {
	...Fixtures.ibkr.smciSplitOldRow,
	symbol: IbkrSymbol.Schema.parse("SMCI"),
	isin: IbkrIsin.Schema.parse("US86800U3023"),
	securityID: "US86800U3023",
	quantity: 40.0,
	transactionID: IbkrTransactionId.Schema.parse("3131760429"),
};

test("transform: single stock trade buy", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [],
			corporateActions: [],
			stockTrades: [simpleTradeBuy],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isin).toEqual("US21212112");
	expect(result.groupings[0].stockTrades[0].financialIdentifier.isin).toEqual("US21212112");
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity).toEqual(2);
});

test("transform: single stock trade sell", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [],
			corporateActions: [],
			stockTrades: [simpleTradeSell],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity).toEqual(-2);
});

test("transform: single stock lot", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [],
			corporateActions: [],
			stockTrades: [],
			stockLots: [simpleStockLot],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isin).toEqual("US21212112");
	expect(result.groupings[0].stockTaxLots[0].financialIdentifier.isin).toEqual("US21212112");
});

test("transform: single dividend", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [dividend],
			corporateActions: [],
			stockTrades: [],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isin).toEqual("FR0000120271");
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(
		StagingTradeEventCashTransactionDividend,
	);
	expect(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice).toEqual(
		dividend.amount * dividend.fxRateToBase,
	);
	expect(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingQuantity).toEqual(1);
});

test("transform: single payment in lieu of dividend", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [paymentInLieuOfDividend],
			corporateActions: [],
			stockTrades: [],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(
		StagingTradeEventCashTransactionPaymentInLieuOfDividend,
	);
	expect(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice).toEqual(
		paymentInLieuOfDividend.amount * paymentInLieuOfDividend.fxRateToBase,
	);
});

test("transform: single withholding tax", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [withholdingTaxForDividend],
			corporateActions: [],
			stockTrades: [],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(
		StagingTradeEventCashTransactionWithholdingTax,
	);
	expect(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice).toEqual(
		withholdingTaxForDividend.amount * withholdingTaxForDividend.fxRateToBase,
	);
});

test("transform: withholding tax for payment in lieu", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [withholdingTaxForPaymentInLieu],
			corporateActions: [],
			stockTrades: [],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(
		StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
	);
});

test("transform: corporate actions produce partial relationships only", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [],
			corporateActions: [corporateActionOld, corporateActionNew],
			stockTrades: [],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.identifierRelationships.relationships.length).toEqual(0);
	expect(result.identifierRelationships.partialRelationships.length).toEqual(2);
	const keys = new Set(
		result.identifierRelationships.partialRelationships.map((p) => p.correlationKey),
	);
	expect(keys.has(CorrelationKey.Schema.parse("141913764"))).toEqual(true);
	// biome-ignore lint/style/noNonNullAssertion: test data guarantees both partials exist
	const fromPartial = result.identifierRelationships.partialRelationships.find(
		(p) => p.fromIdentifier !== null && p.toIdentifier === null,
	)!;
	// biome-ignore lint/style/noNonNullAssertion: test data guarantees both partials exist
	const toPartial = result.identifierRelationships.partialRelationships.find(
		(p) => p.toIdentifier !== null && p.fromIdentifier === null,
	)!;
	// biome-ignore lint/style/noNonNullAssertion: find predicate guarantees fromIdentifier is non-null
	expect(fromPartial.fromIdentifier!.isin).toEqual("US86800U1043");
	// biome-ignore lint/style/noNonNullAssertion: find predicate guarantees toIdentifier is non-null
	expect(toPartial.toIdentifier!.isin).toEqual("US86800U3023");
	expect(fromPartial.changeType).toEqual(StagingIdentifierChangeType.SPLIT);
});

test("transform: resolve partials produces full relationship", () => {
	const staging = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [],
			corporateActions: [corporateActionOld, corporateActionNew],
			stockTrades: [],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	const resolved =
		new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(
			staging,
		);
	expect(resolved.identifierRelationships.relationships.length).toEqual(1);
	expect(resolved.identifierRelationships.relationships[0].fromIdentifier.isin).toEqual(
		"US86800U1043",
	);
	expect(resolved.identifierRelationships.relationships[0].toIdentifier.isin).toEqual(
		"US86800U3023",
	);
	expect(resolved.identifierRelationships.relationships[0].changeType).toEqual(
		StagingIdentifierChangeType.SPLIT,
	);
});

test("transform: no corporate actions produces no partials", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({
			cashTransactions: [],
			corporateActions: [],
			stockTrades: [],
			stockLots: [],
			derivativeTrades: [],
			derivativeLots: [],
		}),
	);
	expect(result.identifierRelationships.relationships.length).toEqual(0);
	expect(result.identifierRelationships.partialRelationships.length).toEqual(0);
});
