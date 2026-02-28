import {
	AssetClass,
	CorporateAction,
	LotDerivative,
	LotStock,
	TradeDerivative,
	TradeStock,
	TransactionCash,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas.ts";
import type { SegmentedTrades } from "@brrr/Brokerages/Ibkr/Schemas/SegmentedTrades.ts";
import { XMLParser } from "fast-xml-parser";

function _toArray<T>(val: T | T[] | undefined | null): T[] {
	if (val === undefined || val === null) return [];
	return Array.isArray(val) ? val : [val];
}

export class IbkrExtractService {
	private readonly _parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

	public extractFromXML(xmlString: string): SegmentedTrades {
		const doc = this._parser.parse(xmlString);
		const statementOrStatements = doc?.FlexQueryResponse?.FlexStatements?.FlexStatement;

		const statements: Record<string, unknown>[] = _toArray(statementOrStatements);

		if (statements.length === 0) {
			return { cashTransactions: [], corporateActions: [], stockTrades: [], stockLots: [], derivativeTrades: [], derivativeLots: [] };
		}

		const extracted = statements.map((s) => this._extractFromStatement(s));
		return this.mergeTrades(extracted);
	}

	public mergeTrades(trades: SegmentedTrades[]): SegmentedTrades {
		return {
			stockTrades: this._deduplicateByTransactionID<TradeStock>(trades.map((t) => t.stockTrades)),
			stockLots: trades.flatMap((t) => t.stockLots),
			derivativeTrades: this._deduplicateByTransactionID<TradeDerivative>(trades.map((t) => t.derivativeTrades)),
			derivativeLots: trades.flatMap((t) => t.derivativeLots),
			cashTransactions: this._deduplicateByTransactionID<TransactionCash>(trades.map((t) => t.cashTransactions)),
			corporateActions: this._deduplicateByTransactionID<CorporateAction>(trades.map((t) => t.corporateActions)),
		};
	}

	private _deduplicateByTransactionID<T extends { transactionID: string }>(lists: T[][]): T[] {
		const all = lists.flat();
		const map = new Map<string, T>();
		for (const item of all) {
			map.set(item.transactionID, item);
		}
		return Array.from(map.values());
	}

	private _extractFromStatement(statement: Record<string, unknown>): SegmentedTrades {
		const tradesNode = (statement?.Trades ?? {}) as Record<string, unknown>;
		const allTrades = _toArray(tradesNode.Trade as Record<string, string> | Record<string, string>[]);
		const allLots = _toArray(tradesNode.Lot as Record<string, string> | Record<string, string>[]);

		const stockTrades = allTrades.filter((t) => t["assetCategory"] === AssetClass.STOCK).map((a) => TradeStock.Schema.parse(a));
		const stockLots = allLots.filter((t) => t["assetCategory"] === AssetClass.STOCK).map((a) => LotStock.Schema.parse(a));
		const derivativeTrades = allTrades.filter((t) => t["assetCategory"] === AssetClass.OPTION).map((a) => TradeDerivative.Schema.parse(a));
		const derivativeLots = allLots.filter((t) => t["assetCategory"] === AssetClass.OPTION).map((a) => LotDerivative.Schema.parse(a));

		const cashNode = statement?.CashTransactions as Record<string, unknown> | undefined;
		const cashTransactions = _toArray(cashNode?.CashTransaction as Record<string, string> | Record<string, string>[]).map((a) =>
			TransactionCash.Schema.parse(a)
		);

		const caNode = statement?.CorporateActions as Record<string, unknown> | undefined;
		const corporateActions = _toArray(caNode?.CorporateAction as Record<string, string> | Record<string, string>[]).map((a) =>
			CorporateAction.Schema.parse(a)
		);

		return { cashTransactions, corporateActions, stockTrades, stockLots, derivativeTrades, derivativeLots };
	}
}
