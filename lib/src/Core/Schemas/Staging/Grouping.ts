import type { GenericCategory } from "@brrr/Core/Schemas/CommonFormats";
import type { StagingTradeEventDerivative, StagingTradeEventStock, StagingTransactionCash } from "@brrr/Core/Schemas/Staging/Events";
import type { StagingTaxLot } from "@brrr/Core/Schemas/Staging/Lots";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";

export class StagingFinancialGrouping {
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly countryOfOrigin: string | null;
	public readonly underlyingCategory: GenericCategory;
	public readonly stockTrades: StagingTradeEventStock[];
	public readonly stockTaxLots: StagingTaxLot[];
	public readonly derivativeTrades: StagingTradeEventDerivative[];
	public readonly derivativeTaxLots: StagingTaxLot[];
	public readonly cashTransactions: StagingTransactionCash[];

	constructor(args: {
		financialIdentifier: StagingFinancialIdentifier;
		countryOfOrigin: string | null;
		underlyingCategory: GenericCategory;
		stockTrades: StagingTradeEventStock[];
		stockTaxLots: StagingTaxLot[];
		derivativeTrades: StagingTradeEventDerivative[];
		derivativeTaxLots: StagingTaxLot[];
		cashTransactions: StagingTransactionCash[];
	}) {
		this.financialIdentifier = args.financialIdentifier;
		this.countryOfOrigin = args.countryOfOrigin;
		this.underlyingCategory = args.underlyingCategory;
		this.stockTrades = args.stockTrades;
		this.stockTaxLots = args.stockTaxLots;
		this.derivativeTrades = args.derivativeTrades;
		this.derivativeTaxLots = args.derivativeTaxLots;
		this.cashTransactions = args.cashTransactions;
	}
}
