import type { CorporateAction } from "@brrr/Brokers/Ibkr/Schemas/CorporateAction";
import type { LotDerivative } from "@brrr/Brokers/Ibkr/Schemas/LotDerivative";
import type { LotStock } from "@brrr/Brokers/Ibkr/Schemas/LotStock";
import type { TradeDerivative } from "@brrr/Brokers/Ibkr/Schemas/TradeDerivative";
import type { TradeStock } from "@brrr/Brokers/Ibkr/Schemas/TradeStock";
import type { TransactionCash } from "@brrr/Brokers/Ibkr/Schemas/TransactionCash";

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
