import {
	type CashTransactionArgs,
	CashTransactionBase,
} from "@brrr/Core/Schemas/Events/CashTransaction/CashTransactionBase";
import type { DividendType } from "@brrr/Core/Schemas/Events/DividendType";

type DividendArgs = CashTransactionArgs & { dividendType: DividendType };

export class TradeEventCashTransactionPaymentInLieuOfDividend extends CashTransactionBase {
	public readonly dividendType: DividendType;

	constructor(args: DividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}
