import { FifoLotMatchingMethod } from "@brrr/Core/LotMatching/FifoLotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { createLotMatchingMethod } from "@brrr/TaxAuthorities/LotMatchingMethodFactory";

test("PROVIDED uses the broker's lots", () => {
	expect(createLotMatchingMethod(TaxAuthorityLotMatchingMethod.PROVIDED, [])).toBeInstanceOf(
		ProvidedLotMatchingMethod,
	);
});

test("FIFO matches first in, first out", () => {
	expect(createLotMatchingMethod(TaxAuthorityLotMatchingMethod.FIFO, [])).toBeInstanceOf(
		FifoLotMatchingMethod,
	);
});

test("NONE falls back to FIFO", () => {
	expect(createLotMatchingMethod(TaxAuthorityLotMatchingMethod.NONE, [])).toBeInstanceOf(
		FifoLotMatchingMethod,
	);
});
