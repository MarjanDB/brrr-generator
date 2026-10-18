import type { CountryCode } from "@brrr/Core/Models/Identifiers";
import type { Category } from "@brrr/Core/Models/Instrument/Category";
import type { StagingTradeEventCashTransaction } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransaction";
import type { StagingTradeEventDerivative } from "@brrr/Core/Models/Staging/Events/Derivative/StagingTradeEventDerivative";
import type { StagingTradeEventStock } from "@brrr/Core/Models/Staging/Events/Stock/StagingTradeEventStock";
import type { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";
import type { StagingTaxLot } from "@brrr/Core/Models/Staging/Lots/StagingTaxLot";

export class StagingFinancialGrouping {
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly countryOfOrigin: CountryCode | null;
	public readonly underlyingCategory: Category;
	public readonly stockTrades: StagingTradeEventStock[];
	public readonly stockTaxLots: StagingTaxLot[];
	public readonly derivativeTrades: StagingTradeEventDerivative[];
	public readonly derivativeTaxLots: StagingTaxLot[];
	public readonly cashTransactions: StagingTradeEventCashTransaction[];

	public constructor(args: {
		financialIdentifier: StagingFinancialIdentifier;
		countryOfOrigin: CountryCode | null;
		underlyingCategory: Category;
		stockTrades: StagingTradeEventStock[];
		stockTaxLots: StagingTaxLot[];
		derivativeTrades: StagingTradeEventDerivative[];
		derivativeTaxLots: StagingTaxLot[];
		cashTransactions: StagingTradeEventCashTransaction[];
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
