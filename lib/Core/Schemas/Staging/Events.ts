import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import type {
	GenericAssetClass,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier.ts";

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

export class StagingTradeEventStockAcquired {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly acquiredReason: GenericTradeReportItemGainType;

	constructor(args: StagingTradeEventArgs & { acquiredReason: GenericTradeReportItemGainType }) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.acquiredReason = args.acquiredReason;
	}

	copy(overrides: Partial<ConstructorParameters<typeof StagingTradeEventStockAcquired>[0]>): StagingTradeEventStockAcquired {
		return new StagingTradeEventStockAcquired({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			acquiredReason: this.acquiredReason,
			...overrides,
		});
	}
}

export class StagingTradeEventStockSold {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;

	constructor(args: StagingTradeEventArgs) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
	}

	copy(overrides: Partial<ConstructorParameters<typeof StagingTradeEventStockSold>[0]>): StagingTradeEventStockSold {
		return new StagingTradeEventStockSold({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			...overrides,
		});
	}
}

export type StagingTradeEventStock = StagingTradeEventStockAcquired | StagingTradeEventStockSold;

export class StagingTradeEventDerivativeAcquired {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly acquiredReason: GenericDerivativeReportItemGainType;

	constructor(args: StagingTradeEventArgs & { acquiredReason: GenericDerivativeReportItemGainType }) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.acquiredReason = args.acquiredReason;
	}

	copy(overrides: Partial<ConstructorParameters<typeof StagingTradeEventDerivativeAcquired>[0]>): StagingTradeEventDerivativeAcquired {
		return new StagingTradeEventDerivativeAcquired({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			acquiredReason: this.acquiredReason,
			...overrides,
		});
	}
}

export class StagingTradeEventDerivativeSold {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;

	constructor(args: StagingTradeEventArgs) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
	}

	copy(overrides: Partial<ConstructorParameters<typeof StagingTradeEventDerivativeSold>[0]>): StagingTradeEventDerivativeSold {
		return new StagingTradeEventDerivativeSold({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			...overrides,
		});
	}
}

export type StagingTradeEventDerivative = StagingTradeEventDerivativeAcquired | StagingTradeEventDerivativeSold;

export class StagingTradeEventCashTransactionDividend {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;
	public readonly dividendType: GenericDividendType;

	constructor(args: StagingCashTransactionArgs & { dividendType: GenericDividendType }) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
		this.dividendType = args.dividendType;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof StagingTradeEventCashTransactionDividend>[0]>,
	): StagingTradeEventCashTransactionDividend {
		return new StagingTradeEventCashTransactionDividend({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			actionId: this.actionId,
			transactionId: this.transactionId,
			listingExchange: this.listingExchange,
			dividendType: this.dividendType,
			...overrides,
		});
	}
}

export class StagingTradeEventCashTransactionWithholdingTax {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;

	constructor(args: StagingCashTransactionArgs) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof StagingTradeEventCashTransactionWithholdingTax>[0]>,
	): StagingTradeEventCashTransactionWithholdingTax {
		return new StagingTradeEventCashTransactionWithholdingTax({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			actionId: this.actionId,
			transactionId: this.transactionId,
			listingExchange: this.listingExchange,
			...overrides,
		});
	}
}

export class StagingTradeEventCashTransactionPaymentInLieuOfDividends {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;
	public readonly dividendType: GenericDividendType;

	constructor(args: StagingCashTransactionArgs & { dividendType: GenericDividendType }) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
		this.dividendType = args.dividendType;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof StagingTradeEventCashTransactionPaymentInLieuOfDividends>[0]>,
	): StagingTradeEventCashTransactionPaymentInLieuOfDividends {
		return new StagingTradeEventCashTransactionPaymentInLieuOfDividends({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			actionId: this.actionId,
			transactionId: this.transactionId,
			listingExchange: this.listingExchange,
			dividendType: this.dividendType,
			...overrides,
		});
	}
}

export class StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;

	constructor(args: StagingCashTransactionArgs) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends>[0]>,
	): StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends {
		return new StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			actionId: this.actionId,
			transactionId: this.transactionId,
			listingExchange: this.listingExchange,
			...overrides,
		});
	}
}

export type StagingTransactionCash =
	| StagingTradeEventCashTransactionDividend
	| StagingTradeEventCashTransactionWithholdingTax
	| StagingTradeEventCashTransactionPaymentInLieuOfDividends
	| StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends;
