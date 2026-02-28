import type { CorporateAction, LotDerivative, LotStock, TradeDerivative, TradeStock, TransactionCash } from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas.ts";

export type SegmentedTrades = {
	cashTransactions: TransactionCash[];
	corporateActions: CorporateAction[];
	stockTrades: TradeStock[];
	stockLots: LotStock[];
	derivativeTrades: TradeDerivative[];
	derivativeLots: LotDerivative[];
};
