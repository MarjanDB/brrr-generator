import type { CorporateAction, LotStock, TradeStock, TransactionCash } from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas";
import {
	AssetClass,
	BuyOrSell,
	CashTransactionType,
	Codes,
	LevelOfDetail,
	OpenCloseIndicator,
	OrderType,
	SecurityIDType,
	SubCategory,
	TransactionType,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas";
import { SegmentedTrades } from "@brrr/Brokerages/Ibkr/Schemas/SegmentedTrades";
import { IbkrTransformService } from "@brrr/Brokerages/Ibkr/Transform";
import {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	StagingTradeEventCashTransactionWithholdingTax,
	StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends,
} from "@brrr/Core/Schemas/Staging/Events";
import { StagingIdentifierChangeType } from "@brrr/Core/Schemas/Staging/IdentifierRelationship";
import { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

const service = new IbkrTransformService();

function makeDate(iso: string): ValidDateTime {
	return DateTime.fromISO(iso) as ValidDateTime;
}

function makeEmptySegmented(overrides: Partial<ConstructorParameters<typeof SegmentedTrades>[0]>): SegmentedTrades {
	return new SegmentedTrades({
		cashTransactions: [],
		corporateActions: [],
		stockTrades: [],
		stockLots: [],
		derivativeTrades: [],
		derivativeLots: [],
		...overrides,
	});
}

const simpleTradeBuy: TradeStock = {
	clientAccountID: "test",
	currency: "EUR",
	fxRateToBase: 1,
	assetClass: AssetClass.STOCK,
	subCategory: SubCategory.COMMON,
	symbol: "TEST",
	description: "",
	conid: "conid",
	securityID: "securityid",
	securityIDType: SecurityIDType.ISIN,
	cusip: "cusip",
	isin: "US21212112",
	figi: "FIGI2121312",
	listingExchange: "NYSE",
	reportDate: makeDate("2023-01-01"),
	dateTime: makeDate("2023-01-01T13:00:15"),
	tradeDate: makeDate("2023-01-01"),
	transactionType: TransactionType.EXCHANGE_TRADE,
	exchange: "EXCHA",
	quantity: 2,
	tradePrice: 15,
	tradeMoney: 30,
	proceeds: 1,
	taxes: 0,
	ibCommission: 2,
	ibCommissionCurrency: "EUR",
	netCash: -33,
	netCashInBase: -33,
	closePrice: 15,
	openCloseIndicator: OpenCloseIndicator.OPEN,
	notesAndCodes: [Codes.OPENING_TRADE],
	costBasis: 33,
	fifoProfitAndLossRealized: 0,
	capitalGainsProfitAndLoss: 0,
	forexProfitAndLoss: 0,
	marketToMarketProfitAndLoss: 0,
	buyOrSell: BuyOrSell.BUY,
	transactionID: "ID",
	orderTime: makeDate("2023-01-01T13:00:02"),
	levelOfDetail: LevelOfDetail.EXECUTION,
	changeInPrice: 0,
	changeInQuantity: 2,
	orderType: OrderType.LIMIT,
	accruedInt: 0,
};

const simpleTradeSell: TradeStock = {
	...simpleTradeBuy,
	quantity: -2,
	tradePrice: -15,
	tradeMoney: -30,
	netCash: 33,
	netCashInBase: 33,
	openCloseIndicator: OpenCloseIndicator.CLOSE,
	buyOrSell: BuyOrSell.SELL,
	transactionID: "ID2",
};

const simpleStockLot: LotStock = {
	clientAccountID: "test",
	currency: "EUR",
	fxRateToBase: 1,
	assetClass: AssetClass.STOCK,
	subCategory: SubCategory.COMMON,
	symbol: "TEST",
	description: "",
	conid: "conid",
	securityID: "securityid",
	securityIDType: SecurityIDType.ISIN,
	cusip: "cusip",
	isin: "US21212112",
	figi: "FIGI2121312",
	listingExchange: "NYSE",
	multiplier: 1,
	reportDate: makeDate("2023-01-05"),
	dateTime: makeDate("2023-01-05T13:00:15"),
	tradeDate: makeDate("2023-01-05"),
	exchange: "EXCHA",
	quantity: 2,
	tradePrice: 15,
	openCloseIndicator: OpenCloseIndicator.CLOSE,
	notesAndCodes: [Codes.CLOSING_TRADE],
	costBasis: 33,
	fifoProfitAndLossRealized: 5,
	capitalGainsProfitAndLoss: 5,
	forexProfitAndLoss: 0,
	buyOrSell: BuyOrSell.SELL,
	transactionID: "ID",
	openDateTime: makeDate("2023-01-01T13:00:15"),
	holdingPeriodDateTime: makeDate("2023-01-01T13:00:15"),
	levelOfDetail: LevelOfDetail.CLOSED_LOT,
};

const dividend: TransactionCash = {
	clientAccountID: "FakeAccount",
	currency: "USD",
	fxRateToBase: 1.2,
	assetClass: AssetClass.CASH,
	subCategory: SubCategory.COMMON,
	symbol: "TTE",
	description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE (Ordinary Dividend)",
	conid: "29612193",
	securityID: "FR0000120271",
	securityIDType: SecurityIDType.ISIN,
	cusip: null,
	isin: "FR0000120271",
	figi: null,
	listingExchange: "SBF",
	dateTime: makeDate("2023-01-01T02:00:00"),
	settleDate: makeDate("2023-01-01"),
	amount: 2.64,
	type: CashTransactionType.DIVIDEND,
	code: null,
	transactionID: "269176073",
	reportDate: makeDate("2023-01-01"),
	actionID: "102869793",
};

const withholdingTaxForDividend: TransactionCash = {
	...dividend,
	description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE - FR TAX",
	amount: -0.66,
	type: CashTransactionType.WITHHOLDING_TAX,
	transactionID: "323614082",
};

const paymentInLieuOfDividend: TransactionCash = {
	...dividend,
	description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE (Payment in Lieu of Dividends)",
	type: CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS,
};

const withholdingTaxForPaymentInLieu: TransactionCash = {
	...dividend,
	description: "TTE(FR0000120271) PAYMENT IN LIEU OF DIVIDEND - FR TAX",
	amount: -0.66,
	type: CashTransactionType.WITHHOLDING_TAX,
	transactionID: "323614082",
};

const corporateActionOld: CorporateAction = {
	clientAccountID: "U1",
	accountAlias: null,
	model: null,
	currency: "USD",
	fxRateToBase: 0.90354,
	assetClass: AssetClass.STOCK,
	subCategory: SubCategory.COMMON,
	symbol: "SMCI.OLD",
	description: "SMCI SPLIT",
	conid: "43261373",
	securityID: "US86800U1043",
	securityIDType: SecurityIDType.ISIN,
	cusip: "86800U104",
	isin: "US86800U1043",
	figi: null,
	listingExchange: "NASDAQ",
	underlyingConid: null,
	underlyingSymbol: null,
	underlyingSecurityID: null,
	underlyingListingExchange: null,
	multiplier: 1.0,
	strike: null,
	expiry: null,
	putOrCall: null,
	principalAdjustFactor: null,
	reportDate: makeDate("2024-10-01"),
	dateTime: makeDate("2024-09-30T20:25:00"),
	actionDescription: "SPLIT",
	amount: 0.0,
	proceeds: 0.0,
	value: 0.0,
	quantity: -4.0,
	fifoProfitAndLossRealized: 0.0,
	capitalGainsProfitAndLoss: 0.0,
	forexProfitAndLoss: 0.0,
	marketToMarketProfitAndLoss: 0.0,
	notesAndCodes: [],
	type: "FI",
	transactionID: "3131760419",
	actionID: "141913764",
	levelOfDetail: LevelOfDetail.DETAIL,
	serialNumber: null,
	deliveryType: null,
	commodityType: null,
	fineness: 0.0,
	weight: 0.0,
};

const corporateActionNew: CorporateAction = {
	...corporateActionOld,
	symbol: "SMCI",
	isin: "US86800U3023",
	securityID: "US86800U3023",
	quantity: 40.0,
	transactionID: "3131760429",
};

test("transform: single stock trade buy", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ stockTrades: [simpleTradeBuy] }),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.getIsin()).toEqual("US21212112");
	expect(result.groupings[0].stockTrades[0].financialIdentifier.getIsin()).toEqual("US21212112");
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity).toEqual(2);
});

test("transform: single stock trade sell", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ stockTrades: [simpleTradeSell] }),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity).toEqual(-2);
});

test("transform: single stock lot", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ stockLots: [simpleStockLot] }),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.getIsin()).toEqual("US21212112");
	expect(result.groupings[0].stockTaxLots[0].financialIdentifier.getIsin()).toEqual("US21212112");
});

test("transform: single dividend", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ cashTransactions: [dividend] }),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.getIsin()).toEqual("FR0000120271");
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(StagingTradeEventCashTransactionDividend);
	expect(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice).toEqual(dividend.amount * dividend.fxRateToBase);
	expect(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingQuantity).toEqual(1);
});

test("transform: single payment in lieu of dividend", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ cashTransactions: [paymentInLieuOfDividend] }),
	);
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(StagingTradeEventCashTransactionPaymentInLieuOfDividends);
	expect(
		result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice,
	).toEqual(paymentInLieuOfDividend.amount * paymentInLieuOfDividend.fxRateToBase);
});

test("transform: single withholding tax", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ cashTransactions: [withholdingTaxForDividend] }),
	);
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(StagingTradeEventCashTransactionWithholdingTax);
	expect(
		result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice,
	).toEqual(withholdingTaxForDividend.amount * withholdingTaxForDividend.fxRateToBase);
});

test("transform: withholding tax for payment in lieu", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ cashTransactions: [withholdingTaxForPaymentInLieu] }),
	);
	expect(result.groupings[0].cashTransactions[0]).toBeInstanceOf(StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends);
});

test("transform: corporate actions produce partial relationships only", () => {
	const result = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ corporateActions: [corporateActionOld, corporateActionNew] }),
	);
	expect(result.identifierRelationships.relationships.length).toEqual(0);
	expect(result.identifierRelationships.partialRelationships.length).toEqual(2);
	const keys = new Set(result.identifierRelationships.partialRelationships.map((p) => p.correlationKey));
	expect(keys.has("141913764")).toEqual(true);
	const fromPartial = result.identifierRelationships.partialRelationships.find((p) =>
		p.fromIdentifier !== null && p.toIdentifier === null
	)!;
	const toPartial = result.identifierRelationships.partialRelationships.find((p) =>
		p.toIdentifier !== null && p.fromIdentifier === null
	)!;
	expect(fromPartial.fromIdentifier!.getIsin()).toEqual("US86800U1043");
	expect(toPartial.toIdentifier!.getIsin()).toEqual("US86800U3023");
	expect(fromPartial.changeType).toEqual(StagingIdentifierChangeType.SPLIT);
});

test("transform: resolve partials produces full relationship", () => {
	const staging = service.convertSegmentedTradesToStagingEvents(
		makeEmptySegmented({ corporateActions: [corporateActionOld, corporateActionNew] }),
	);
	const resolved = new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(staging);
	expect(resolved.identifierRelationships.relationships.length).toEqual(1);
	expect(resolved.identifierRelationships.relationships[0].fromIdentifier.getIsin()).toEqual("US86800U1043");
	expect(resolved.identifierRelationships.relationships[0].toIdentifier.getIsin()).toEqual("US86800U3023");
	expect(resolved.identifierRelationships.relationships[0].changeType).toEqual(StagingIdentifierChangeType.SPLIT);
});

test("transform: no corporate actions produces no partials", () => {
	const result = service.convertSegmentedTradesToStagingEvents(makeEmptySegmented({}));
	expect(result.identifierRelationships.relationships.length).toEqual(0);
	expect(result.identifierRelationships.partialRelationships.length).toEqual(0);
});
