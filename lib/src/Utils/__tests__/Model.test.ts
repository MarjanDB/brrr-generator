import {
	GenericAssetClass,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
} from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import { RenameProvenanceStep } from "@brrr/Core/Schemas/Provenance";
import { zDateTimeFromISOString } from "@brrr/Utils/DateTime";

const date = zDateTimeFromISOString.parse("2024-05-01");
const identifier = new FinancialIdentifier({ isin: "US0000000001", ticker: "ABC" });

const base = {
	id: "T1",
	financialIdentifier: identifier,
	assetClass: GenericAssetClass.STOCK,
	date,
	multiplier: 1,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "USD",
		underlyingQuantity: 10,
		underlyingTradePrice: 2,
		commissionCurrency: "USD",
		commissionTotal: -1,
		taxCurrency: "USD",
		taxTotal: 0,
		fxRateToBase: 0.9,
	}),
	provenance: [],
};
const cash = { ...base, actionId: "A1", transactionId: "X1", listingExchange: "NYSE" };

test("copy keeps the subclass and the fields not overridden", () => {
	const event = new TradeEventStockAcquired({
		...base,
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	});

	const copied = event.copy({ multiplier: 5 });

	expect(copied).toBeInstanceOf(TradeEventStockAcquired);
	expect(copied.multiplier).toEqual(5);
	expect(copied.acquiredReason).toEqual(event.acquiredReason);
	expect(copied.id).toEqual(event.id);
	expect(event.multiplier).toEqual(1);
	expect(copied).not.toBe(event);
});

test("every concrete event class survives copy", () => {
	const events = [
		new TradeEventStockAcquired({ ...base, acquiredReason: GenericTradeReportItemGainType.BOUGHT }),
		new TradeEventStockSold(base),
		new TradeEventDerivativeAcquired({
			...base,
			acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
		}),
		new TradeEventDerivativeSold(base),
		new TradeEventCashTransactionDividend({ ...cash, dividendType: GenericDividendType.ORDINARY }),
		new TradeEventCashTransactionPaymentInLieuOfDividend({
			...cash,
			dividendType: GenericDividendType.ORDINARY,
		}),
		new TradeEventCashTransactionWithholdingTax(cash),
		new TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend(cash),
	];

	for (const event of events) {
		expect(event.copy({})).toBeInstanceOf(event.constructor);
	}
});

test("copy keeps cash transaction fields", () => {
	const dividend = new TradeEventCashTransactionDividend({
		...cash,
		dividendType: GenericDividendType.ORDINARY,
	});

	const copied = dividend.copy({ id: "T2" });

	expect(copied.id).toEqual("T2");
	expect(copied.actionId).toEqual("A1");
	expect(copied.transactionId).toEqual("X1");
	expect(copied.listingExchange).toEqual("NYSE");
	expect(copied.dividendType).toEqual(GenericDividendType.ORDINARY);
});

test("copy keeps constant fields", () => {
	const step = new RenameProvenanceStep({
		fromIdentifier: identifier,
		toIdentifier: identifier,
		changeType: IdentifierChangeType.RENAME,
		effectiveDate: date,
	});

	const copied = step.copy({});

	expect(copied).toBeInstanceOf(RenameProvenanceStep);
	expect(copied.kind).toEqual("rename");
});
