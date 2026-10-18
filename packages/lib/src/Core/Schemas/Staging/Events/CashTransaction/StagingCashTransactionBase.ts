import type {
	CashActionId,
	CashTransactionId,
	ListingExchange,
} from "@brrr/Core/Schemas/Identifiers";
import {
	type StagingTradeEventArgs,
	StagingTradeEventBase,
} from "@brrr/Core/Schemas/Staging/Events/StagingTradeEventBase";

export type StagingCashTransactionArgs = StagingTradeEventArgs & {
	actionId: CashActionId;
	transactionId: CashTransactionId;
	listingExchange: ListingExchange;
};

export abstract class StagingCashTransactionBase extends StagingTradeEventBase {
	public readonly actionId: CashActionId;
	public readonly transactionId: CashTransactionId;
	public readonly listingExchange: ListingExchange;

	public constructor(args: StagingCashTransactionArgs) {
		super(args);
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}
}
