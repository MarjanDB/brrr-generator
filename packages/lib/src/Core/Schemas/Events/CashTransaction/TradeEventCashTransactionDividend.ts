import {
	type CashTransactionArgs,
	CashTransactionBase,
} from "@brrr/Core/Schemas/Events/CashTransaction/CashTransactionBase";
import type { DividendType } from "@brrr/Core/Schemas/Events/DividendType";

type DividendArgs = CashTransactionArgs & { dividendType: DividendType };

export class TradeEventCashTransactionDividend extends CashTransactionBase {
	public readonly dividendType: DividendType;

	public constructor(args: DividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}
