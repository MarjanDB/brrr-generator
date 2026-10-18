import type { IdentifierChangeType } from "@brrr/Core/Models/IdentifierRelationships/IdentifierChangeType";
import type {
	CorrelationKey,
	Isin,
	TaxLotId,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Models/Identifiers";
import { AssetClass } from "@brrr/Core/Models/Instrument/AssetClass";
import type { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";

export enum CashTransactionLabel {
	DIVIDEND = "dividend",
	PAYMENT_IN_LIEU = "payment in lieu of dividend",
	WITHHOLDING_TAX = "withholding tax",
	WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU = "withholding tax on payment in lieu",
}

function orDash(value: string | null): string {
	return value ?? "-";
}

// The labels the read side gives its provenance nodes. A staging object and its core twin share
// one label, so these take the fields they print rather than a model.
export const ProvenanceLabels = {
	trade(
		assetClass: AssetClass,
		acquired: boolean,
		id: TradeEventId,
		quantity: number,
		ticker: Ticker | null,
	): string {
		const kind = assetClass === AssetClass.OPTION ? "option" : "stock";
		return `${kind} ${acquired ? "bought" : "sold"} ${id} · ${quantity} ${orDash(ticker)}`;
	},

	cash(kind: CashTransactionLabel, id: TradeEventId, ticker: Ticker | null): string {
		return `${kind} ${id} · ${orDash(ticker)}`;
	},

	lot(id: TaxLotId, quantity: number, ticker: Ticker | null): string {
		return `lot ${id} · ${quantity} ${orDash(ticker)}`;
	},

	grouping(derivative: boolean, isin: Isin | null, ticker: Ticker | null): string {
		return `${derivative ? "derivative grouping" : "grouping"} ${orDash(isin)} · ${orDash(ticker)}`;
	},

	matchedLot(acquiredId: TradeEventId, soldId: TradeEventId, quantity: number): string {
		return `matched lot ${acquiredId} → ${soldId} · ${quantity}`;
	},

	leg(tradeId: TradeEventId, quantity: number): string {
		return `leg ${tradeId} · ${quantity}`;
	},

	corporateActionHalf(
		correlationKey: CorrelationKey,
		fromSide: boolean,
		ticker: Ticker | null,
	): string {
		return `corporate action ${correlationKey} · ${fromSide ? "from" : "to"} ${orDash(ticker)}`;
	},

	corporateAction(
		changeType: StagingIdentifierChangeType | IdentifierChangeType,
		fromTicker: Ticker | null,
		toTicker: Ticker | null,
		split: { before: number; after: number } | null,
	): string {
		const base = `${changeType} ${orDash(fromTicker)} → ${orDash(toTicker)}`;
		return split === null ? base : `${base} (${split.before} → ${split.after})`;
	},
};
