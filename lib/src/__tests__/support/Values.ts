import { GenericMonetaryExchangeInformation } from "@brrr/Core/Schemas/CommonFormats";
import type { TradeEventBase, TradeEventCashTransactionDividend } from "@brrr/Core/Schemas/Events";
import { type ValidDateTime, zDateTimeFromISOString } from "@brrr/Utils/DateTime";

// Ids take the model's own field types, so they follow the model if it moves to nominal types.
type EventId = TradeEventBase["id"];
type CashTransaction = TradeEventCashTransactionDividend;

// The money every event carries. `currency` is the currency of the amount, the commission and the tax.
export type MoneyFields = {
	currency: GenericMonetaryExchangeInformation["underlyingCurrency"];
	commission: number;
	tax: number;
	fxRateToBase: number;
};

// Everything a trade builder needs; none of it has a default.
export type TradeFields = MoneyFields & {
	id: EventId;
	date: string;
	quantity: number;
	price: number;
};

// Everything a cash transaction builder needs; none of it has a default. `amount` is the payment
// (negative for a withholding).
export type CashFields = MoneyFields & {
	id: EventId;
	date: string;
	amount: number;
	actionId: CashTransaction["actionId"];
	transactionId: CashTransaction["transactionId"];
	listingExchange: CashTransaction["listingExchange"];
};

// Turns the builders' fields into the model's values. Nothing here invents a value.
export const Values = {
	date(iso: string): ValidDateTime {
		return zDateTimeFromISOString.parse(iso);
	},

	tradeMoney(fields: TradeFields): GenericMonetaryExchangeInformation {
		return new GenericMonetaryExchangeInformation({
			underlyingCurrency: fields.currency,
			underlyingQuantity: fields.quantity,
			underlyingTradePrice: fields.price,
			commissionCurrency: fields.currency,
			commissionTotal: fields.commission,
			taxCurrency: fields.currency,
			taxTotal: fields.tax,
			fxRateToBase: fields.fxRateToBase,
		});
	},

	// A cash transaction is one unit of its amount.
	cashMoney(fields: CashFields): GenericMonetaryExchangeInformation {
		return new GenericMonetaryExchangeInformation({
			underlyingCurrency: fields.currency,
			underlyingQuantity: 1,
			underlyingTradePrice: fields.amount,
			commissionCurrency: fields.currency,
			commissionTotal: fields.commission,
			taxCurrency: fields.currency,
			taxTotal: fields.tax,
			fxRateToBase: fields.fxRateToBase,
		});
	},
};
