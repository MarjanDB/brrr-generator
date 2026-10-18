import type { TradeEventDerivative } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivative";
import type { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import type { TaxLotDerivative } from "@brrr/Core/Models/Lots/TaxLot";

type DerivativeGroupingArgs = {
	financialIdentifier: FinancialIdentifier;
	derivativeTrades: TradeEventDerivative[];
	derivativeTaxLots: TaxLotDerivative[];
};

export class DerivativeGrouping {
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly derivativeTrades: TradeEventDerivative[];
	public readonly derivativeTaxLots: TaxLotDerivative[];

	public constructor(args: DerivativeGroupingArgs) {
		this.financialIdentifier = args.financialIdentifier;
		this.derivativeTrades = args.derivativeTrades;
		this.derivativeTaxLots = args.derivativeTaxLots;
	}
}
