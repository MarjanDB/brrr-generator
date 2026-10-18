import { IdentifierChangeType, ProvenanceField, type ReportInstrument } from "@brrr/lib";
import { fieldOf } from "~/download/fields";
import { SplitFactor, SplitFactorKind } from "~/download/graph/SplitFactor";
import { formatNumber } from "~/download/labels/formatNumber";
import { SplitChip } from "~/download/labels/SplitChip";

// A split's ratio in the usual form: 4 shares becoming 40 is 10 : 1, 10 becoming 1 is 1 : 10.
export function splitRatioOf(
	chip: SplitChip,
	locale: string,
): { before: string; after: string } | null {
	if (chip.before === null || chip.after === null) {
		return null;
	}
	const factor = SplitFactor.of(chip.before, chip.after);
	if (factor === null) {
		return null;
	}
	const amount = formatNumber(String(factor.amount), locale);
	return factor.kind === SplitFactorKind.MULTIPLY
		? { before: amount, after: "1" }
		: { before: "1", after: amount };
}

function chipKindOf(value: string | null): IdentifierChangeType | null {
	return Object.values(IdentifierChangeType).find((kind) => kind === value) ?? null;
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
