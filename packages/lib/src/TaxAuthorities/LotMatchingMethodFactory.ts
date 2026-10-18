import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import type { TradeEvent } from "@brrr/Core/Models/Events/TradeEvent";
import type { TaxLot } from "@brrr/Core/Models/Lots/TaxLot";
import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/Services/LotMatching/ProvidedLotMatchingMethod";
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
