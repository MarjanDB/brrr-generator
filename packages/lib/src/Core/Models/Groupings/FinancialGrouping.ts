import type { TradeEventCashTransaction } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransaction";
import type { TradeEventStock } from "@brrr/Core/Models/Events/Stock/TradeEventStock";
import type { DerivativeGrouping } from "@brrr/Core/Models/Groupings/DerivativeGrouping";
import type { CountryCode } from "@brrr/Core/Models/Identifiers";
import type { Category } from "@brrr/Core/Models/Instrument/Category";
import type { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import type { TaxLotStock } from "@brrr/Core/Models/Lots/TaxLot";
import type { AnyProvenanceStep } from "@brrr/Core/Models/Provenance/AnyProvenanceStep";

type FinancialGroupingArgs = {
	financialIdentifier: FinancialIdentifier;
	countryOfOrigin: CountryCode | null;
	underlyingCategory: Category;
	stockTrades: TradeEventStock[];
	stockTaxLots: TaxLotStock[];
	derivativeGroupings: DerivativeGrouping[];
	cashTransactions: TradeEventCashTransaction[];
	provenance: AnyProvenanceStep[];
};

export class FinancialGrouping {
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly countryOfOrigin: CountryCode | null;
	public readonly underlyingCategory: Category;
	public readonly stockTrades: TradeEventStock[];
	public readonly stockTaxLots: TaxLotStock[];
	public readonly derivativeGroupings: DerivativeGrouping[];
	public readonly cashTransactions: TradeEventCashTransaction[];
	public readonly provenance: AnyProvenanceStep[];

	public constructor(args: FinancialGroupingArgs) {
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
