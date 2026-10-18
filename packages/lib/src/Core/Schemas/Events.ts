import type {
	AssetClass,
	ExchangedMoney,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import type {
	CashActionId,
	CashTransactionId,
	ListingExchange,
	TradeEventId,
} from "@brrr/Core/Schemas/Identifiers";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type TradeEventArgs = {
	id: TradeEventId;
	assetClass: AssetClass;
	date: ValidDateTime;
	multiplier: number;
	exchangedMoney: ExchangedMoney;
	provenance: AnyProvenanceStep[];
};

type CashTransactionArgs = TradeEventArgs & {
	actionId: CashActionId;
	transactionId: CashTransactionId;
	listingExchange: ListingExchange;
};

export abstract class TradeEventBase {
	public readonly id: TradeEventId;
	public readonly assetClass: AssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: ExchangedMoney;
	public readonly provenance: AnyProvenanceStep[];

	constructor(args: TradeEventArgs) {
		this.id = args.id;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
	}
}

abstract class CashTransactionBase extends TradeEventBase {
	public readonly actionId: CashActionId;
	public readonly transactionId: CashTransactionId;
	public readonly listingExchange: ListingExchange;

	constructor(args: CashTransactionArgs) {
		super(args);
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}
}

type StockAcquiredArgs = TradeEventArgs & { acquiredReason: GenericTradeReportItemGainType };

export class TradeEventStockAcquired extends TradeEventBase {
	public readonly acquiredReason: GenericTradeReportItemGainType;

	constructor(args: StockAcquiredArgs) {
		super(args);
		this.acquiredReason = args.acquiredReason;
	}
}

export class TradeEventStockSold extends TradeEventBase {}

export type TradeEventStock = TradeEventStockAcquired | TradeEventStockSold;

type DerivativeAcquiredArgs = TradeEventArgs & {
	acquiredReason: GenericDerivativeReportItemGainType;
};

export class TradeEventDerivativeAcquired extends TradeEventBase {
	public readonly acquiredReason: GenericDerivativeReportItemGainType;

	constructor(args: DerivativeAcquiredArgs) {
		super(args);
		this.acquiredReason = args.acquiredReason;
	}
}

export class TradeEventDerivativeSold extends TradeEventBase {}

export type TradeEventDerivative = TradeEventDerivativeAcquired | TradeEventDerivativeSold;

type DividendArgs = CashTransactionArgs & { dividendType: GenericDividendType };

export class TradeEventCashTransactionDividend extends CashTransactionBase {
	public readonly dividendType: GenericDividendType;

	constructor(args: DividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}

export class TradeEventCashTransactionPaymentInLieuOfDividend extends CashTransactionBase {
	public readonly dividendType: GenericDividendType;

	constructor(args: DividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}

export class TradeEventCashTransactionWithholdingTax extends CashTransactionBase {}

export class TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend extends CashTransactionBase {}

export type TradeEventCashTransaction =
	| TradeEventCashTransactionDividend
	| TradeEventCashTransactionWithholdingTax
	| TradeEventCashTransactionPaymentInLieuOfDividend
	| TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend;

export type TradeEvent = TradeEventStock | TradeEventDerivative | TradeEventCashTransaction;
