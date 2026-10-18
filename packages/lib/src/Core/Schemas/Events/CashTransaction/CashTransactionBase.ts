import { type TradeEventArgs, TradeEventBase } from "@brrr/Core/Schemas/Events/TradeEventBase";
import type {
	CashActionId,
	CashTransactionId,
	ListingExchange,
} from "@brrr/Core/Schemas/Identifiers";

export type CashTransactionArgs = TradeEventArgs & {
	actionId: CashActionId;
	transactionId: CashTransactionId;
	listingExchange: ListingExchange;
};

export abstract class CashTransactionBase extends TradeEventBase {
	public readonly actionId: CashActionId;
	public readonly transactionId: CashTransactionId;
	public readonly listingExchange: ListingExchange;

	public constructor(args: CashTransactionArgs) {
		super(args);
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}
}
