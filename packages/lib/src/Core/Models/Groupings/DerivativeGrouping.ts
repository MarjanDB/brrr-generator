import type { TradeEventDerivative } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivative";
import type { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import type { OptionContract } from "@brrr/Core/Models/Instrument/OptionContract";
import type { TaxLotDerivative } from "@brrr/Core/Models/Lots/TaxLot";

type DerivativeGroupingArgs = {
	financialIdentifier: FinancialIdentifier;
	contract: OptionContract;
	derivativeTrades: TradeEventDerivative[];
	derivativeTaxLots: TaxLotDerivative[];
};

export class DerivativeGrouping {
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly contract: OptionContract;
	public readonly derivativeTrades: TradeEventDerivative[];
	public readonly derivativeTaxLots: TaxLotDerivative[];

	public constructor(args: DerivativeGroupingArgs) {
		this.financialIdentifier = args.financialIdentifier;
		this.contract = args.contract;
		this.derivativeTrades = args.derivativeTrades;
		this.derivativeTaxLots = args.derivativeTaxLots;
	}
}
