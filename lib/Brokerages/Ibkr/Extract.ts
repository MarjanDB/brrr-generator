import {
	AssetClass,
	CorporateAction,
	FlexQueryResponseSchema,
	LotDerivative,
	LotStock,
	TradeDerivative,
	TradeStock,
	TransactionCash,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas.ts";
import { SegmentedTrades } from "@brrr/Brokerages/Ibkr/Schemas/SegmentedTrades.ts";
import { XMLParser } from "fast-xml-parser";

export class IbkrExtractService {
	private readonly _parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

	public extractFromXML(xmlString: string): SegmentedTrades {
		const doc = FlexQueryResponseSchema.parse(this._parser.parse(xmlString));
		const statements = doc.FlexQueryResponse.FlexStatements.FlexStatement;

		if (statements.length === 0) {
			return new SegmentedTrades({
				cashTransactions: [],
				corporateActions: [],
				stockTrades: [],
				stockLots: [],
				derivativeTrades: [],
				derivativeLots: [],
			});
		}

		const extracted = statements.map((s) => {
			const allTrades = s.Trades.Trade;
			const allLots = s.Trades.Lot;

			const stockTrades = allTrades.filter((t) => t["assetCategory"] === AssetClass.STOCK).map((a) => TradeStock.Schema.parse(a));
			const stockLots = allLots.filter((t) => t["assetCategory"] === AssetClass.STOCK).map((a) => LotStock.Schema.parse(a));
			const derivativeTrades = allTrades.filter((t) => t["assetCategory"] === AssetClass.OPTION).map((a) =>
				TradeDerivative.Schema.parse(a)
			);
			const derivativeLots = allLots.filter((t) => t["assetCategory"] === AssetClass.OPTION).map((a) =>
				LotDerivative.Schema.parse(a)
			);
			const cashTransactions = s.CashTransactions.CashTransaction.map((a) => TransactionCash.Schema.parse(a));
			const corporateActions = s.CorporateActions.CorporateAction.map((a) => CorporateAction.Schema.parse(a));

			return new SegmentedTrades({ cashTransactions, corporateActions, stockTrades, stockLots, derivativeTrades, derivativeLots });
		});

		return this.mergeTrades(extracted);
	}

	public mergeTrades(trades: SegmentedTrades[]): SegmentedTrades {
		return new SegmentedTrades({
			stockTrades: this._deduplicateByTransactionID<TradeStock>(trades.map((t) => t.stockTrades)),
			stockLots: trades.flatMap((t) => t.stockLots), // lots cannot be deduplicated, as there is no unique identifier
			derivativeTrades: this._deduplicateByTransactionID<TradeDerivative>(trades.map((t) => t.derivativeTrades)),
			derivativeLots: trades.flatMap((t) => t.derivativeLots), // lots cannot be deduplicated, as there is no unique identifier
			cashTransactions: this._deduplicateByTransactionID<TransactionCash>(trades.map((t) => t.cashTransactions)),
			corporateActions: this._deduplicateByTransactionID<CorporateAction>(trades.map((t) => t.corporateActions)),
		});
	}

	private _deduplicateByTransactionID<T extends { transactionID: string }>(lists: T[][]): T[] {
		const all = lists.flat();
		const map = new Map<string, T>();
		for (const item of all) {
			map.set(item.transactionID, item);
		}
		return Array.from(map.values());
	}
}
