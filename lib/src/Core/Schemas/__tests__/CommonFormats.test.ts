import { GenericMonetaryExchangeInformation } from "@brrr/Core/Schemas/CommonFormats";

test("money copy keeps the class", () => {
	const money = new GenericMonetaryExchangeInformation({
		underlyingCurrency: "USD",
		underlyingQuantity: 10,
		underlyingTradePrice: 2,
		commissionCurrency: "USD",
		commissionTotal: -1,
		taxCurrency: "USD",
		taxTotal: 0.5,
		fxRateToBase: 0.9,
	});

	const copied = money.copy({ underlyingQuantity: 2 });

	expect(copied).toBeInstanceOf(GenericMonetaryExchangeInformation);
	expect(copied.underlyingQuantity).toEqual(2);
	expect(copied.underlyingTradePrice).toEqual(2);
	expect(copied.commissionCurrency).toEqual("USD");
	expect(copied.commissionTotal).toEqual(-1);
	expect(copied.taxTotal).toEqual(0.5);
	expect(copied.fxRateToBase).toEqual(0.9);
});
