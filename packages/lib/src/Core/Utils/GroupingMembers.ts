import type { DerivativeGrouping } from "@brrr/Core/Models/Groupings/DerivativeGrouping";
import type { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import type { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";

// Records a grouping as made from the events and lots it holds. Its derivative groupings are
// left out: they are instruments of their own, with their own members.
export function recordGroupingMembers(
	provenance: IProvenanceRecorder,
	grouping: FinancialGrouping,
	by: ProvenanceStage,
): void {
	provenance.derive(
		[...grouping.stockTrades, ...grouping.stockTaxLots, ...grouping.cashTransactions],
		grouping,
		ProvenanceChange.GROUPED,
		by,
		null,
	);
}

export function recordDerivativeGroupingMembers(
	provenance: IProvenanceRecorder,
	grouping: DerivativeGrouping,
	by: ProvenanceStage,
): void {
	provenance.derive(
		[...grouping.derivativeTrades, ...grouping.derivativeTaxLots],
		grouping,
		ProvenanceChange.GROUPED,
		by,
		null,
	);
}
