import type {
	GenericAssetClass,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { Model } from "@brrr/Utils/Model";

type StagingTradeEventArgs = {
	id: string;
	financialIdentifier: StagingFinancialIdentifier;
	assetClass: GenericAssetClass;
	date: ValidDateTime;
	multiplier: number;
	exchangedMoney: GenericMonetaryExchangeInformation;
};

type StagingCashTransactionArgs = StagingTradeEventArgs & {
	actionId: string;
	transactionId: string;
	listingExchange: string;
};

abstract class StagingTradeEventBase<
	TArgs extends StagingTradeEventArgs = StagingTradeEventArgs,
> extends Model<TArgs> {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;

	constructor(args: StagingTradeEventArgs) {
		super();
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
	}
}

abstract class StagingCashTransactionBase<
	TArgs extends StagingCashTransactionArgs,
> extends StagingTradeEventBase<TArgs> {
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;

	constructor(args: StagingCashTransactionArgs) {
		super(args);
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}
}

type StagingStockAcquiredArgs = StagingTradeEventArgs & {
	acquiredReason: GenericTradeReportItemGainType;
};

export class StagingTradeEventStockAcquired extends StagingTradeEventBase<StagingStockAcquiredArgs> {
	public readonly acquiredReason: GenericTradeReportItemGainType;

	constructor(args: StagingStockAcquiredArgs) {
		super(args);
		this.acquiredReason = args.acquiredReason;
	}
}

export class StagingTradeEventStockSold extends StagingTradeEventBase {}

export type StagingTradeEventStock = StagingTradeEventStockAcquired | StagingTradeEventStockSold;

type StagingDerivativeAcquiredArgs = StagingTradeEventArgs & {
	acquiredReason: GenericDerivativeReportItemGainType;
};

export class StagingTradeEventDerivativeAcquired extends StagingTradeEventBase<StagingDerivativeAcquiredArgs> {
	public readonly acquiredReason: GenericDerivativeReportItemGainType;

	constructor(args: StagingDerivativeAcquiredArgs) {
		super(args);
		this.acquiredReason = args.acquiredReason;
	}
}

export class StagingTradeEventDerivativeSold extends StagingTradeEventBase {}

export type StagingTradeEventDerivative =
	| StagingTradeEventDerivativeAcquired
	| StagingTradeEventDerivativeSold;

type StagingDividendArgs = StagingCashTransactionArgs & { dividendType: GenericDividendType };

export class StagingTradeEventCashTransactionDividend extends StagingCashTransactionBase<StagingDividendArgs> {
	public readonly dividendType: GenericDividendType;

	constructor(args: StagingDividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}

export class StagingTradeEventCashTransactionWithholdingTax extends StagingCashTransactionBase<StagingCashTransactionArgs> {}

export class StagingTradeEventCashTransactionPaymentInLieuOfDividends extends StagingCashTransactionBase<StagingDividendArgs> {
	public readonly dividendType: GenericDividendType;

	constructor(args: StagingDividendArgs) {
		super(args);
		this.dividendType = args.dividendType;
	}
}

export class StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends extends StagingCashTransactionBase<StagingCashTransactionArgs> {}

export type StagingTransactionCash =
	| StagingTradeEventCashTransactionDividend
	| StagingTradeEventCashTransactionWithholdingTax
	| StagingTradeEventCashTransactionPaymentInLieuOfDividends
	| StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends;
