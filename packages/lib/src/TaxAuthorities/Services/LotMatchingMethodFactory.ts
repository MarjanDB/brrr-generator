import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import type { TradeEvent } from "@brrr/Core/Models/Events/TradeEvent";
import type { TaxLot } from "@brrr/Core/Models/Lots/TaxLot";
import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/Services/LotMatching/ProvidedLotMatchingMethod";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";

export function createLotMatchingMethod(
	method: TaxAuthorityLotMatchingMethod,
	providedLots: TaxLot<TradeEvent, TradeEvent>[],
	_provenance: IProvenanceRecorder,
): ILotMatchingMethod {
	if (method === TaxAuthorityLotMatchingMethod.PROVIDED) {
		return new ProvidedLotMatchingMethod(providedLots, _provenance);
	}
	// NONE has no implementation of its own and matches FIFO.
	return new FifoLotMatchingMethod();
}
