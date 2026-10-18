import {
	type CashTransactionArgs,
	CashTransactionBase,
} from "@brrr/Core/Models/Events/CashTransaction/CashTransactionBase";
import type { DividendType } from "@brrr/Core/Models/Events/DividendType";

type DividendArgs = CashTransactionArgs & { dividendType: DividendType };

export class TradeEventCashTransactionPaymentInLieuOfDividend extends CashTransactionBase {
	public readonly dividendType: DividendType;

	public constructor(args: DividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}
