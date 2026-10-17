import { GenericMonetaryExchangeInformation } from "@brrr/Core/Schemas/CommonFormats";
import { type ValidDateTime, zDateTimeFromISOString } from "@brrr/Utils/DateTime";

export function makeDate(iso: string): ValidDateTime {
	return zDateTimeFromISOString.parse(iso);
}

// Anything not given is 1 EUR unit at a price of 1, with no commission or tax and a base rate of 1.
export function makeMoney(
	fields: Partial<ConstructorParameters<typeof GenericMonetaryExchangeInformation>[0]>,
): GenericMonetaryExchangeInformation {
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
}
