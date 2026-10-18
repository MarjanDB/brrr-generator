import { SegmentedTrades } from "@brrr/Brokers/Ibkr/Models/SegmentedTrades";
import { CorporateAction } from "@brrr/Brokers/Ibkr/Schemas/CorporateAction";
import { IbkrAssetClass } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrAssetClass";
import { FlexQueryResponseSchema } from "@brrr/Brokers/Ibkr/Schemas/FlexQueryResponse";
import type { IbkrTransactionId } from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import { LotDerivative } from "@brrr/Brokers/Ibkr/Schemas/LotDerivative";
import { LotStock } from "@brrr/Brokers/Ibkr/Schemas/LotStock";
import { TradeDerivative } from "@brrr/Brokers/Ibkr/Schemas/TradeDerivative";
import { TradeStock } from "@brrr/Brokers/Ibkr/Schemas/TradeStock";
import { TransactionCash } from "@brrr/Brokers/Ibkr/Schemas/TransactionCash";
import { XMLParser } from "fast-xml-parser";

export class IbkrExtractService {
	private readonly xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

	public extractFromXML(xmlString: string): SegmentedTrades {
		const doc = FlexQueryResponseSchema.parse(this.xmlParser.parse(xmlString));
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

			const stockTrades = allTrades
				.filter((t) => t.assetCategory === IbkrAssetClass.STOCK)
				.map((a) => TradeStock.Schema.parse(a));
			const stockLots = allLots
				.filter((t) => t.assetCategory === IbkrAssetClass.STOCK)
				.map((a) => LotStock.Schema.parse(a));
			const derivativeTrades = allTrades
				.filter((t) => t.assetCategory === IbkrAssetClass.OPTION)
				.map((a) => TradeDerivative.Schema.parse(a));
			const derivativeLots = allLots
				.filter((t) => t.assetCategory === IbkrAssetClass.OPTION)
				.map((a) => LotDerivative.Schema.parse(a));
			const cashTransactions = s.CashTransactions.CashTransaction.map((a) =>
				TransactionCash.Schema.parse(a),
			);
			const corporateActions = s.CorporateActions.CorporateAction.map((a) =>
				CorporateAction.Schema.parse(a),
			);

			return new SegmentedTrades({
				cashTransactions,
				corporateActions,
				stockTrades,
				stockLots,
				derivativeTrades,
				derivativeLots,
			});
		});

		return this.mergeTrades(extracted);
	}

	public mergeTrades(trades: SegmentedTrades[]): SegmentedTrades {
		return new SegmentedTrades({
			stockTrades: this.deduplicateByTransactionID<TradeStock>(trades.map((t) => t.stockTrades)),
			stockLots: trades.flatMap((t) => t.stockLots), // lots cannot be deduplicated, as there is no unique identifier
			derivativeTrades: this.deduplicateByTransactionID<TradeDerivative>(
				trades.map((t) => t.derivativeTrades),
			),
			derivativeLots: trades.flatMap((t) => t.derivativeLots), // lots cannot be deduplicated, as there is no unique identifier
			cashTransactions: this.deduplicateByTransactionID<TransactionCash>(
				trades.map((t) => t.cashTransactions),
			),
			corporateActions: this.deduplicateByTransactionID<CorporateAction>(
				trades.map((t) => t.corporateActions),
			),
		});
	}

	private deduplicateByTransactionID<T extends { transactionID: IbkrTransactionId }>(
		lists: T[][],
	): T[] {
		const all = lists.flat();
		const map = new Map<IbkrTransactionId, T>();
		for (const item of all) {
			map.set(item.transactionID, item);
		}
		return Array.from(map.values());
	}
}
