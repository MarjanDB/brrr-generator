import type { DividendType } from "@brrr/Core/Models/Events/DividendType";
import {
	type StagingCashTransactionArgs,
	StagingCashTransactionBase,
} from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingCashTransactionBase";

type StagingDividendArgs = StagingCashTransactionArgs & { dividendType: DividendType };

export class StagingTradeEventCashTransactionPaymentInLieuOfDividend extends StagingCashTransactionBase {
	public readonly dividendType: DividendType;

	public constructor(args: StagingDividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}
