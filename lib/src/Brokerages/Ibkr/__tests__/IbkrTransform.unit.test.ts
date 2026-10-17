import { Scenario } from "@brrr/__tests__/support/Scenario";
import {
	BuyOrSell,
	CashTransactionType,
	OpenCloseIndicator,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas";
import { IbkrTransformService } from "@brrr/Brokerages/Ibkr/Transform";
import {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	StagingTradeEventCashTransactionWithholdingTax,
	StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends,
} from "@brrr/Core/Schemas/Staging/Events";
import { StagingIdentifierChangeType } from "@brrr/Core/Schemas/Staging/IdentifierRelationship";
import { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution";

const { ibkr } = Scenario.build;

const service = new IbkrTransformService();

const simpleTradeBuy = ibkr.tradeStock();

const simpleTradeSell = ibkr.tradeStock({
	quantity: -2,
	tradePrice: -15,
	tradeMoney: -30,
	netCash: 33,
	netCashInBase: 33,
	openCloseIndicator: OpenCloseIndicator.CLOSE,
	buyOrSell: BuyOrSell.SELL,
	transactionID: "ID2",
});

const simpleStockLot = ibkr.lotStock();

const dividend = ibkr.cashTransaction();

const withholdingTaxForDividend = ibkr.cashTransaction({
	description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE - FR TAX",
	amount: -0.66,
	type: CashTransactionType.WITHHOLDING_TAX,
	transactionID: "323614082",
});

const paymentInLieuOfDividend = ibkr.cashTransaction({
	description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE (Payment in Lieu of Dividends)",
	type: CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS,
});

const withholdingTaxForPaymentInLieu = ibkr.cashTransaction({
	description: "TTE(FR0000120271) PAYMENT IN LIEU OF DIVIDEND - FR TAX",
	amount: -0.66,
	type: CashTransactionType.WITHHOLDING_TAX,
	transactionID: "323614082",
});

const corporateActionOld = ibkr.corporateAction();

const corporateActionNew = ibkr.corporateAction({
	symbol: "SMCI",
	isin: "US86800U3023",
	securityID: "US86800U3023",
	quantity: 40.0,
	transactionID: "3131760429",
});

test("transform: single stock trade buy", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({ stockTrades: [simpleTradeBuy] }),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isin).toEqual("US21212112");
	expect(result.groupings[0].stockTrades[0].financialIdentifier.isin).toEqual("US21212112");
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity).toEqual(2);
});

test("transform: single stock trade sell", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({ stockTrades: [simpleTradeSell] }),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity).toEqual(-2);
});

test("transform: single stock lot", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({ stockLots: [simpleStockLot] }),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isin).toEqual("US21212112");
	expect(result.groupings[0].stockTaxLots[0].financialIdentifier.isin).toEqual("US21212112");
});

test("transform: single dividend", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({ cashTransactions: [dividend] }),
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
		ibkr.segmentedTrades({ cashTransactions: [paymentInLieuOfDividend] }),
	);
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(
		StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	);
	expect(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice).toEqual(
		paymentInLieuOfDividend.amount * paymentInLieuOfDividend.fxRateToBase,
	);
});

test("transform: single withholding tax", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({ cashTransactions: [withholdingTaxForDividend] }),
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
		ibkr.segmentedTrades({ cashTransactions: [withholdingTaxForPaymentInLieu] }),
	);
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(
		StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends,
	);
});

test("transform: corporate actions produce partial relationships only", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		ibkr.segmentedTrades({ corporateActions: [corporateActionOld, corporateActionNew] }),
	);
	expect(result.identifierRelationships.relationships.length).toEqual(0);
	expect(result.identifierRelationships.partialRelationships.length).toEqual(2);
	const keys = new Set(
		result.identifierRelationships.partialRelationships.map((p) => p.correlationKey),
	);
	expect(keys.has("141913764")).toEqual(true);
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
		ibkr.segmentedTrades({ corporateActions: [corporateActionOld, corporateActionNew] }),
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
	const result = service.convertSegmentedTradesToStagingEvents(ibkr.segmentedTrades());
	expect(result.identifierRelationships.relationships.length).toEqual(0);
	expect(result.identifierRelationships.partialRelationships.length).toEqual(0);
});
