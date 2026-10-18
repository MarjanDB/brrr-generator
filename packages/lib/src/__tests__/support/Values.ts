import type { TradeEventCashTransactionDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionDividend";
import { ExchangedMoney } from "@brrr/Core/Models/Events/ExchangedMoney";
import type { TradeEventBase } from "@brrr/Core/Models/Events/TradeEventBase";
import { type ValidDateTime, zDateTimeFromISOString } from "@brrr/Utils/DateTime";

// Ids take the model's own field types, so they follow the model if it moves to nominal types.
type EventId = TradeEventBase["id"];
type CashTransaction = TradeEventCashTransactionDividend;

// The money every event carries. `currency` is the currency of the amount, the commission and the tax.
export type MoneyFields = {
	currency: ExchangedMoney["currency"];
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

	tradeMoney(fields: TradeFields): ExchangedMoney {
		return new ExchangedMoney({
			currency: fields.currency,
			quantity: fields.quantity,
			priceInBase: fields.price,
			commissionCurrency: fields.currency,
			commissionInBase: fields.commission,
			taxCurrency: fields.currency,
			taxTotal: fields.tax,
			fxRateToBase: fields.fxRateToBase,
		});
	},

	// A cash transaction is one unit of its amount.
	cashMoney(fields: CashFields): ExchangedMoney {
		return new ExchangedMoney({
			currency: fields.currency,
			quantity: 1,
			priceInBase: fields.amount,
			commissionCurrency: fields.currency,
			commissionInBase: fields.commission,
			taxCurrency: fields.currency,
			taxTotal: fields.tax,
			fxRateToBase: fields.fxRateToBase,
		});
	},
};
