import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import type { TradeEvent } from "@brrr/Core/Models/Events/TradeEvent";
import type { TaxLot } from "@brrr/Core/Models/Lots/TaxLot";
import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/Services/LotMatching/ProvidedLotMatchingMethod";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";

const STAGE = ProvenanceStage.Schema.parse("LotMatchingMethodFactory");

export function createLotMatchingMethod(
	method: TaxAuthorityLotMatchingMethod,
	providedLots: TaxLot<TradeEvent, TradeEvent>[],
	provenance: IProvenanceRecorder,
): ILotMatchingMethod {
	if (method === TaxAuthorityLotMatchingMethod.PROVIDED) {
		return new ProvidedLotMatchingMethod(providedLots, provenance);
	}
	for (const lot of providedLots) {
		provenance.drop(lot, DropReason.NOT_USED, STAGE, `lot matching is ${method}`);
	}
	// NONE has no implementation of its own and matches FIFO.
	return new FifoLotMatchingMethod();
}
