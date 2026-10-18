import { FifoLotMatchingMethod } from "@brrr/Core/LotMatching/FifoLotMatchingMethod";
import type { ILotMatchingMethod } from "@brrr/Core/LotMatching/ILotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import type { TradeEvent } from "@brrr/Core/Schemas/Events/TradeEvent";
import type { TaxLot } from "@brrr/Core/Schemas/Lots/TaxLot";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";

export function createLotMatchingMethod(
	method: TaxAuthorityLotMatchingMethod,
	providedLots: TaxLot<TradeEvent, TradeEvent>[],
): ILotMatchingMethod {
	if (method === TaxAuthorityLotMatchingMethod.PROVIDED) {
		return new ProvidedLotMatchingMethod(providedLots);
	}
	// NONE has no implementation of its own and matches FIFO.
	return new FifoLotMatchingMethod();
}
