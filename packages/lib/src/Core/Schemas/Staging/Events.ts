import type {
	AcquisitionMethod,
	AssetClass,
	DividendType,
	ExchangedMoney,
} from "@brrr/Core/Schemas/CommonFormats";
import type {
	CashActionId,
	CashTransactionId,
	ListingExchange,
	TradeEventId,
} from "@brrr/Core/Schemas/Identifiers";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type StagingTradeEventArgs = {
	id: TradeEventId;
	financialIdentifier: StagingFinancialIdentifier;
	assetClass: AssetClass;
	date: ValidDateTime;
	multiplier: number;
	exchangedMoney: ExchangedMoney;
};

type StagingCashTransactionArgs = StagingTradeEventArgs & {
	actionId: CashActionId;
	transactionId: CashTransactionId;
	listingExchange: ListingExchange;
};

abstract class StagingTradeEventBase {
	public readonly id: TradeEventId;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: AssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: ExchangedMoney;

	constructor(args: StagingTradeEventArgs) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
	}
}

abstract class StagingCashTransactionBase extends StagingTradeEventBase {
	public readonly actionId: CashActionId;
	public readonly transactionId: CashTransactionId;
	public readonly listingExchange: ListingExchange;

	constructor(args: StagingCashTransactionArgs) {
		super(args);
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}
}

type StagingStockAcquiredArgs = StagingTradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
};

export class StagingTradeEventStockAcquired extends StagingTradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	constructor(args: StagingStockAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}

export class StagingTradeEventStockSold extends StagingTradeEventBase {}

export type StagingTradeEventStock = StagingTradeEventStockAcquired | StagingTradeEventStockSold;

type StagingDerivativeAcquiredArgs = StagingTradeEventArgs & {
	acquisitionMethod: AcquisitionMethod;
};

export class StagingTradeEventDerivativeAcquired extends StagingTradeEventBase {
	public readonly acquisitionMethod: AcquisitionMethod;

	constructor(args: StagingDerivativeAcquiredArgs) {
		super(args);
		this.acquisitionMethod = args.acquisitionMethod;
	}
}

export class StagingTradeEventDerivativeSold extends StagingTradeEventBase {}

export type StagingTradeEventDerivative =
	| StagingTradeEventDerivativeAcquired
	| StagingTradeEventDerivativeSold;

type StagingDividendArgs = StagingCashTransactionArgs & { dividendType: DividendType };

export class StagingTradeEventCashTransactionDividend extends StagingCashTransactionBase {
	public readonly dividendType: DividendType;

	constructor(args: StagingDividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}

export class StagingTradeEventCashTransactionWithholdingTax extends StagingCashTransactionBase {}

export class StagingTradeEventCashTransactionPaymentInLieuOfDividend extends StagingCashTransactionBase {
	public readonly dividendType: DividendType;

	constructor(args: StagingDividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}

export class StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend extends StagingCashTransactionBase {}

export type StagingTradeEventCashTransaction =
	| StagingTradeEventCashTransactionDividend
	| StagingTradeEventCashTransactionWithholdingTax
	| StagingTradeEventCashTransactionPaymentInLieuOfDividend
	| StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend;
