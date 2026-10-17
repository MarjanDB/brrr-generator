import type {
	CorporateAction,
	LotDerivative,
	LotStock,
	TradeDerivative,
	TradeStock,
	TransactionCash,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas";

export class SegmentedTrades {
	public readonly cashTransactions: TransactionCash[];
	public readonly corporateActions: CorporateAction[];
	public readonly stockTrades: TradeStock[];
	public readonly stockLots: LotStock[];
	public readonly derivativeTrades: TradeDerivative[];
	public readonly derivativeLots: LotDerivative[];

	public constructor(args: {
		cashTransactions: TransactionCash[];
		corporateActions: CorporateAction[];
		stockTrades: TradeStock[];
		stockLots: LotStock[];
		derivativeTrades: TradeDerivative[];
		derivativeLots: LotDerivative[];
	}) {
		this.cashTransactions = args.cashTransactions;
		this.corporateActions = args.corporateActions;
		this.stockTrades = args.stockTrades;
		this.stockLots = args.stockLots;
		this.derivativeTrades = args.derivativeTrades;
		this.derivativeLots = args.derivativeLots;
	}
}
