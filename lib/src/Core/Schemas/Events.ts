import type {
	GenericAssetClass,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type TradeEventArgs = {
	id: string;
	assetClass: GenericAssetClass;
	date: ValidDateTime;
	multiplier: number;
	exchangedMoney: GenericMonetaryExchangeInformation;
	provenance: AnyProvenanceStep[];
};

type CashTransactionArgs = TradeEventArgs & {
	actionId: string;
	transactionId: string;
	listingExchange: string;
};

export abstract class TradeEventBase {
	public readonly id: string;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
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
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;

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

export type TransactionCash =
	| TradeEventCashTransactionDividend
	| TradeEventCashTransactionWithholdingTax
	| TradeEventCashTransactionPaymentInLieuOfDividend
	| TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend;

export type TradeEvent = TradeEventStock | TradeEventDerivative | TransactionCash;
