import { AssetClass } from "@brrr/Core/Models/Instrument/AssetClass";

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
		id: string,
		quantity: number,
		ticker: string | null,
	): string {
		const kind = assetClass === AssetClass.OPTION ? "option" : "stock";
		return `${kind} ${acquired ? "bought" : "sold"} ${id} · ${quantity} ${orDash(ticker)}`;
	},

	cash(kind: CashTransactionLabel, id: string, ticker: string | null): string {
		return `${kind} ${id} · ${orDash(ticker)}`;
	},

	lot(id: string, quantity: number, ticker: string | null): string {
		return `lot ${id} · ${quantity} ${orDash(ticker)}`;
	},

	grouping(derivative: boolean, isin: string | null, ticker: string | null): string {
		return `${derivative ? "derivative grouping" : "grouping"} ${orDash(isin)} · ${orDash(ticker)}`;
	},

	corporateActionHalf(correlationKey: string, fromSide: boolean, ticker: string | null): string {
		return `corporate action ${correlationKey} · ${fromSide ? "from" : "to"} ${orDash(ticker)}`;
	},

	corporateAction(
		changeType: string,
		fromTicker: string | null,
		toTicker: string | null,
		split: { before: number; after: number } | null,
	): string {
		const base = `${changeType} ${orDash(fromTicker)} → ${orDash(toTicker)}`;
		return split === null ? base : `${base} (${split.before} → ${split.after})`;
	},
};
