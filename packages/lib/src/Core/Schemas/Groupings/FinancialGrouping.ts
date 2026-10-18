import type { TradeEventCashTransaction } from "@brrr/Core/Schemas/Events/CashTransaction/TradeEventCashTransaction";
import type { TradeEventStock } from "@brrr/Core/Schemas/Events/Stock/TradeEventStock";
import type { DerivativeGrouping } from "@brrr/Core/Schemas/Groupings/DerivativeGrouping";
import type { CountryCode } from "@brrr/Core/Schemas/Identifiers";
import type { Category } from "@brrr/Core/Schemas/Instrument/Category";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/Instrument/FinancialIdentifier";
import type { TaxLotStock } from "@brrr/Core/Schemas/Lots/TaxLot";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance/AnyProvenanceStep";

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
