import type { GenericCategory } from "@brrr/Core/Schemas/CommonFormats";
import type {
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
	TransactionCash,
} from "@brrr/Core/Schemas/Events";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import type { TaxLotDerivative, TaxLotStock } from "@brrr/Core/Schemas/Lots";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance";

type DerivativeGroupingArgs = {
	financialIdentifier: FinancialIdentifier;
	derivativeTrades: (TradeEventDerivativeAcquired | TradeEventDerivativeSold)[];
	derivativeTaxLots: TaxLotDerivative[];
	provenance: AnyProvenanceStep[];
};

export class DerivativeGrouping {
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly derivativeTrades: (TradeEventDerivativeAcquired | TradeEventDerivativeSold)[];
	public readonly derivativeTaxLots: TaxLotDerivative[];
	public readonly provenance: AnyProvenanceStep[];

	constructor(args: DerivativeGroupingArgs) {
		this.financialIdentifier = args.financialIdentifier;
		this.derivativeTrades = args.derivativeTrades;
		this.derivativeTaxLots = args.derivativeTaxLots;
		this.provenance = args.provenance;
	}
}

type FinancialGroupingArgs = {
	financialIdentifier: FinancialIdentifier;
	countryOfOrigin: string | null;
	underlyingCategory: GenericCategory;
	stockTrades: (TradeEventStockAcquired | TradeEventStockSold)[];
	stockTaxLots: TaxLotStock[];
	derivativeGroupings: DerivativeGrouping[];
	cashTransactions: TransactionCash[];
	provenance: AnyProvenanceStep[];
};

export class FinancialGrouping {
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly countryOfOrigin: string | null;
	public readonly underlyingCategory: GenericCategory;
	public readonly stockTrades: (TradeEventStockAcquired | TradeEventStockSold)[];
	public readonly stockTaxLots: TaxLotStock[];
	public readonly derivativeGroupings: DerivativeGrouping[];
	public readonly cashTransactions: TransactionCash[];
	public readonly provenance: AnyProvenanceStep[];

	constructor(args: FinancialGroupingArgs) {
		this.financialIdentifier = args.financialIdentifier;
		this.countryOfOrigin = args.countryOfOrigin;
		this.underlyingCategory = args.underlyingCategory;
		this.stockTrades = args.stockTrades;
		this.stockTaxLots = args.stockTaxLots;
		this.derivativeGroupings = args.derivativeGroupings;
		this.cashTransactions = args.cashTransactions;
		this.provenance = args.provenance;
	}
}
