import { ProvenanceField, type ReportInstrument } from "@brrr/lib";
import { fieldOf } from "~/download/fields";
import { CorporateActionChipKind } from "~/download/labels/CorporateActionChipKind";
import { SplitChip } from "~/download/labels/SplitChip";

function chipKindOf(value: string | null): CorporateActionChipKind | null {
	return Object.values(CorporateActionChipKind).find((kind) => kind === value) ?? null;
}

// One chip per corporate action behind the instrument, from the facts the action recorded.
export function chipsOf(instrument: ReportInstrument): SplitChip[] {
	return instrument.corporateActions.flatMap((action) => {
		const kind = chipKindOf(fieldOf(action, ProvenanceField.CORPORATE_ACTION_KIND));
		if (kind === null) {
			return [];
		}
		return [
			new SplitChip({
				kind,
				before: fieldOf(action, ProvenanceField.SPLIT_BEFORE),
				after: fieldOf(action, ProvenanceField.SPLIT_AFTER),
				fromIsin: fieldOf(action, ProvenanceField.FROM_ISIN),
				fromTicker: fieldOf(action, ProvenanceField.FROM_TICKER),
			}),
		];
	});
}
