import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/Services/LotMatching/ProvidedLotMatchingMethod";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { createLotMatchingMethod } from "@brrr/TaxAuthorities/Services/LotMatchingMethodFactory";

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
