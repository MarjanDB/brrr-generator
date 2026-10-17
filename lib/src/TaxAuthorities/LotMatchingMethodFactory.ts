import { FifoLotMatchingMethod } from "@brrr/Core/LotMatching/FifoLotMatchingMethod";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import type { TradeEvent } from "@brrr/Core/Schemas/Events";
import type { TaxLot } from "@brrr/Core/Schemas/Lots";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";

export function createLotMatchingMethod(
	method: TaxAuthorityLotMatchingMethod,
	providedLots: TaxLot<TradeEvent, TradeEvent>[],
): LotMatchingMethod {
	if (method === TaxAuthorityLotMatchingMethod.PROVIDED) {
		return new ProvidedLotMatchingMethod(providedLots);
	}
	// NONE has no implementation of its own and matches FIFO.
	return new FifoLotMatchingMethod();
}
