import type {
	GenericAssetClass,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type TradeEventArgs = {
	id: string;
	financialIdentifier: FinancialIdentifier;
	assetClass: GenericAssetClass;
	date: ValidDateTime;
	multiplier: number;
	exchangedMoney: GenericMonetaryExchangeInformation;
	provenance: AnyProvenanceStep[];
};

type CashTransactionArgs = TradeEventArgs & {
	actionId: string;
	transactionId: string;
};

export class TradeEventStockAcquired {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly provenance: AnyProvenanceStep[];
	public readonly acquiredReason: GenericTradeReportItemGainType;

	constructor(args: TradeEventArgs & { acquiredReason: GenericTradeReportItemGainType }) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
		this.acquiredReason = args.acquiredReason;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof TradeEventStockAcquired>[0]>,
	): TradeEventStockAcquired {
		return new TradeEventStockAcquired({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			provenance: this.provenance,
			acquiredReason: this.acquiredReason,
			...overrides,
		});
	}
}

export class TradeEventStockSold {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly provenance: AnyProvenanceStep[];

	constructor(args: TradeEventArgs) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof TradeEventStockSold>[0]>,
	): TradeEventStockSold {
		return new TradeEventStockSold({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			provenance: this.provenance,
			...overrides,
		});
	}
}

export type TradeEventStock = TradeEventStockAcquired | TradeEventStockSold;

export class TradeEventDerivativeAcquired {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly provenance: AnyProvenanceStep[];
	public readonly acquiredReason: GenericDerivativeReportItemGainType;

	constructor(args: TradeEventArgs & { acquiredReason: GenericDerivativeReportItemGainType }) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
		this.acquiredReason = args.acquiredReason;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof TradeEventDerivativeAcquired>[0]>,
	): TradeEventDerivativeAcquired {
		return new TradeEventDerivativeAcquired({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			provenance: this.provenance,
			acquiredReason: this.acquiredReason,
			...overrides,
		});
	}
}

export class TradeEventDerivativeSold {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly provenance: AnyProvenanceStep[];

	constructor(args: TradeEventArgs) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof TradeEventDerivativeSold>[0]>,
	): TradeEventDerivativeSold {
		return new TradeEventDerivativeSold({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			provenance: this.provenance,
			...overrides,
		});
	}
}

export type TradeEventDerivative = TradeEventDerivativeAcquired | TradeEventDerivativeSold;

export class TradeEventCashTransactionDividend {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly provenance: AnyProvenanceStep[];
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;
	public readonly dividendType: GenericDividendType;

	constructor(
		args: CashTransactionArgs & { listingExchange: string; dividendType: GenericDividendType },
	) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
		this.dividendType = args.dividendType;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof TradeEventCashTransactionDividend>[0]>,
	): TradeEventCashTransactionDividend {
		return new TradeEventCashTransactionDividend({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			provenance: this.provenance,
			actionId: this.actionId,
			transactionId: this.transactionId,
			listingExchange: this.listingExchange,
			dividendType: this.dividendType,
			...overrides,
		});
	}
}

export class TradeEventCashTransactionPaymentInLieuOfDividend {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly provenance: AnyProvenanceStep[];
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;
	public readonly dividendType: GenericDividendType;

	constructor(
		args: CashTransactionArgs & { listingExchange: string; dividendType: GenericDividendType },
	) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
		this.dividendType = args.dividendType;
	}

	copy(
		overrides: Partial<
			ConstructorParameters<typeof TradeEventCashTransactionPaymentInLieuOfDividend>[0]
		>,
	): TradeEventCashTransactionPaymentInLieuOfDividend {
		return new TradeEventCashTransactionPaymentInLieuOfDividend({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			provenance: this.provenance,
			actionId: this.actionId,
			transactionId: this.transactionId,
			listingExchange: this.listingExchange,
			dividendType: this.dividendType,
			...overrides,
		});
	}
}

export class TradeEventCashTransactionWithholdingTax {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly provenance: AnyProvenanceStep[];
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;

	constructor(args: CashTransactionArgs & { listingExchange: string }) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof TradeEventCashTransactionWithholdingTax>[0]>,
	): TradeEventCashTransactionWithholdingTax {
		return new TradeEventCashTransactionWithholdingTax({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			provenance: this.provenance,
			actionId: this.actionId,
			transactionId: this.transactionId,
			listingExchange: this.listingExchange,
			...overrides,
		});
	}
}

export class TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly assetClass: GenericAssetClass;
	public readonly date: ValidDateTime;
	public readonly multiplier: number;
	public readonly exchangedMoney: GenericMonetaryExchangeInformation;
	public readonly provenance: AnyProvenanceStep[];
	public readonly actionId: string;
	public readonly transactionId: string;
	public readonly listingExchange: string;

	constructor(args: CashTransactionArgs & { listingExchange: string }) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.assetClass = args.assetClass;
		this.date = args.date;
		this.multiplier = args.multiplier;
		this.exchangedMoney = args.exchangedMoney;
		this.provenance = args.provenance;
		this.actionId = args.actionId;
		this.transactionId = args.transactionId;
		this.listingExchange = args.listingExchange;
	}

	copy(
		overrides: Partial<
			ConstructorParameters<
				typeof TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend
			>[0]
		>,
	): TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend {
		return new TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
			assetClass: this.assetClass,
			date: this.date,
			multiplier: this.multiplier,
			exchangedMoney: this.exchangedMoney,
			provenance: this.provenance,
			actionId: this.actionId,
			transactionId: this.transactionId,
			listingExchange: this.listingExchange,
			...overrides,
		});
	}
}

export type TransactionCash =
	| TradeEventCashTransactionDividend
	| TradeEventCashTransactionWithholdingTax
	| TradeEventCashTransactionPaymentInLieuOfDividend
	| TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend;

export type TradeEvent = TradeEventStock | TradeEventDerivative | TransactionCash;
