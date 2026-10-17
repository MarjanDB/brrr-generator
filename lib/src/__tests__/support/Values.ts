import { GenericMonetaryExchangeInformation } from "@brrr/Core/Schemas/CommonFormats";
import type { TradeEventBase, TradeEventCashTransactionDividend } from "@brrr/Core/Schemas/Events";
import { type ValidDateTime, zDateTimeFromISOString } from "@brrr/Utils/DateTime";

// Ids take the model's own field types, so they follow the model if it moves to nominal types.
type EventId = TradeEventBase["id"];
type CashTransaction = TradeEventCashTransactionDividend;

export type MoneyFields = Partial<
	ConstructorParameters<typeof GenericMonetaryExchangeInformation>[0]
>;

// What every trade builder takes. `money` holds the rest of the exchanged money: currencies,
// commission, tax, rate to base.
export type TradeOptions = {
	id?: EventId;
	date?: string;
	quantity?: number;
	price?: number;
	multiplier?: number;
	money?: MoneyFields;
};

// What every cash transaction builder takes. `amount` is the payment (negative for a withholding).
export type CashOptions = {
	id?: EventId;
	date?: string;
	amount?: number;
	actionId?: CashTransaction["actionId"];
	transactionId?: CashTransaction["transactionId"];
	listingExchange?: CashTransaction["listingExchange"];
	money?: MoneyFields;
};

let lastId = 0;

// The values the builders share: defaults for dates, money and ids.
export const Values = {
	defaultDate: "2023-01-01",

	date(iso: string): ValidDateTime {
		return zDateTimeFromISOString.parse(iso);
	},

	// Anything not given is 1 EUR unit at a price of 1, with no commission or tax, at a rate of 1.
	money(fields: MoneyFields = {}): GenericMonetaryExchangeInformation {
		return new GenericMonetaryExchangeInformation({
			underlyingCurrency: "EUR",
			underlyingQuantity: 1,
			underlyingTradePrice: 1,
			commissionCurrency: "EUR",
			commissionTotal: 0,
			taxCurrency: "EUR",
			taxTotal: 0,
			fxRateToBase: 1,
			...fields,
		});
	},

	// A unique id for a built object nobody refers to by id.
	nextId(prefix: string): EventId {
		lastId += 1;
		return `${prefix}-${lastId}`;
	},

	tradeMoney(options: TradeOptions, defaultQuantity: number): GenericMonetaryExchangeInformation {
		return Values.money({
			...options.money,
			underlyingQuantity: options.quantity ?? options.money?.underlyingQuantity ?? defaultQuantity,
			underlyingTradePrice: options.price ?? options.money?.underlyingTradePrice ?? 1,
		});
	},

	cashMoney(options: CashOptions, defaultAmount: number): GenericMonetaryExchangeInformation {
		return Values.money({
			...options.money,
			underlyingTradePrice: options.amount ?? options.money?.underlyingTradePrice ?? defaultAmount,
		});
	},

	// The fields every cash transaction carries.
	cashFields(options: CashOptions, prefix: string) {
		const id = options.id ?? Values.nextId(prefix);
		return {
			id,
			date: Values.date(options.date ?? Values.defaultDate),
			multiplier: 1,
			actionId: options.actionId ?? "ACTION",
			transactionId: options.transactionId ?? id,
			listingExchange: options.listingExchange ?? "EXH",
		};
	},
};
