import type { DividendType } from "@brrr/Core/Schemas/Events/DividendType";
import {
	type StagingCashTransactionArgs,
	StagingCashTransactionBase,
} from "@brrr/Core/Schemas/Staging/Events/CashTransaction/StagingCashTransactionBase";

type StagingDividendArgs = StagingCashTransactionArgs & { dividendType: DividendType };

export class StagingTradeEventCashTransactionPaymentInLieuOfDividend extends StagingCashTransactionBase {
	public readonly dividendType: DividendType;

	constructor(args: StagingDividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}
