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
import type { ImportFile } from "@brrr/Brokers/Models/ImportFile";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { XMLParser } from "fast-xml-parser";

const STAGE = ProvenanceStage.Schema.parse("IbkrExtractService");

type RawRow = Record<string, unknown>;

// One XML row and what came of it, collected before anything is recorded so that a file that
// fails halfway leaves nothing behind.
type RowOutcome = {
	element: string;
	row: RawRow;
	schemaName: string;
	record: { transactionID: IbkrTransactionId } | null;
	dropDetail: string | null;
};

export class IbkrExtractService {
	private readonly xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

	public extractFromXML(file: ImportFile, provenance: IProvenanceRecorder): SegmentedTrades {
		const doc = FlexQueryResponseSchema.parse(this.xmlParser.parse(file.xml));
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

		const outcomes: RowOutcome[] = [];
		const extracted = statements.map((s) => {
			const stockTrades: TradeStock[] = [];
			const derivativeTrades: TradeDerivative[] = [];
			for (const row of s.Trades.Trade) {
				if (row.assetCategory === IbkrAssetClass.STOCK) {
					const record = TradeStock.Schema.parse(row);
					stockTrades.push(record);
					outcomes.push(this.parsed("Trade", row, "TradeStock", record));
				} else if (row.assetCategory === IbkrAssetClass.OPTION) {
					const record = TradeDerivative.Schema.parse(row);
					derivativeTrades.push(record);
					outcomes.push(this.parsed("Trade", row, "TradeDerivative", record));
				} else {
					outcomes.push(this.unsupported("Trade", row));
				}
			}
			const stockLots: LotStock[] = [];
			const derivativeLots: LotDerivative[] = [];
			for (const row of s.Trades.Lot) {
				if (row.assetCategory === IbkrAssetClass.STOCK) {
					const record = LotStock.Schema.parse(row);
					stockLots.push(record);
					outcomes.push(this.parsed("Lot", row, "LotStock", record));
				} else if (row.assetCategory === IbkrAssetClass.OPTION) {
					const record = LotDerivative.Schema.parse(row);
					derivativeLots.push(record);
					outcomes.push(this.parsed("Lot", row, "LotDerivative", record));
				} else {
					outcomes.push(this.unsupported("Lot", row));
				}
			}
			const cashTransactions = s.CashTransactions.CashTransaction.map((row) => {
				const record = TransactionCash.Schema.parse(row);
				outcomes.push(this.parsed("CashTransaction", row, "TransactionCash", record));
				return record;
			});
			const corporateActions = s.CorporateActions.CorporateAction.map((row) => {
				const record = CorporateAction.Schema.parse(row);
				outcomes.push(this.parsed("CorporateAction", row, "CorporateAction", record));
				return record;
			});

			return new SegmentedTrades({
				cashTransactions,
				corporateActions,
				stockTrades,
				stockLots,
				derivativeTrades,
				derivativeLots,
			});
		});

		this.record(file, outcomes, provenance);
		return this.mergeTrades(extracted, provenance);
	}

	public mergeTrades(trades: SegmentedTrades[], provenance: IProvenanceRecorder): SegmentedTrades {
		return new SegmentedTrades({
			stockTrades: this.deduplicateByTransactionID<TradeStock>(
				trades.map((t) => t.stockTrades),
				provenance,
			),
			stockLots: trades.flatMap((t) => t.stockLots), // lots cannot be deduplicated, as there is no unique identifier
			derivativeTrades: this.deduplicateByTransactionID<TradeDerivative>(
				trades.map((t) => t.derivativeTrades),
				provenance,
			),
			derivativeLots: trades.flatMap((t) => t.derivativeLots), // lots cannot be deduplicated, as there is no unique identifier
			cashTransactions: this.deduplicateByTransactionID<TransactionCash>(
				trades.map((t) => t.cashTransactions),
				provenance,
			),
			corporateActions: this.deduplicateByTransactionID<CorporateAction>(
				trades.map((t) => t.corporateActions),
				provenance,
			),
		});
	}

	private deduplicateByTransactionID<T extends { transactionID: IbkrTransactionId }>(
		lists: T[][],
		provenance: IProvenanceRecorder,
	): T[] {
		const all = lists.flat();
		const kept = new Map<IbkrTransactionId, T>();
		const losers = new Map<IbkrTransactionId, T[]>();
		for (const item of all) {
			const previous = kept.get(item.transactionID);
			if (previous !== undefined) {
				losers.set(item.transactionID, [...(losers.get(item.transactionID) ?? []), previous]);
			}
			kept.set(item.transactionID, item);
		}
		for (const [transactionID, copies] of losers) {
			const winner = kept.get(transactionID);
			if (winner !== undefined) {
				provenance.derive(copies, winner, ProvenanceChange.DEDUPLICATED, STAGE, null);
			}
		}
		return Array.from(kept.values());
	}

	private parsed(
		element: string,
		row: RawRow,
		schemaName: string,
		record: { transactionID: IbkrTransactionId },
	): RowOutcome {
		return { element, row, schemaName, record, dropDetail: null };
	}

	private unsupported(element: string, row: RawRow): RowOutcome {
		return {
			element,
			row,
			schemaName: "",
			record: null,
			dropDetail: `asset class ${String(row.assetCategory)}`,
		};
	}

	private record(file: ImportFile, outcomes: RowOutcome[], provenance: IProvenanceRecorder): void {
		for (const outcome of outcomes) {
			const fields = Object.fromEntries(
				Object.entries(outcome.row).map(([name, value]) => [name, String(value)]),
			);
			const label = `${outcome.element} ${String(outcome.row.transactionID)} · ${String(outcome.row.symbol)}`;
			provenance.node(outcome.row, ProvenanceNodeKind.ROW, label, fields);
			provenance.derive([file], outcome.row, ProvenanceChange.CONTAINS, STAGE, null);
			if (outcome.record === null) {
				provenance.drop(outcome.row, DropReason.NOT_SUPPORTED, STAGE, outcome.dropDetail);
				continue;
			}
			provenance.node(
				outcome.record,
				ProvenanceNodeKind.RECORD,
				`${outcome.schemaName} ${outcome.record.transactionID}`,
				{},
			);
			provenance.derive([outcome.row], outcome.record, ProvenanceChange.PARSED, STAGE, null);
		}
	}
}
