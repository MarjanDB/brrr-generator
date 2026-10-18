import { EDavkiProvenanceField } from "@brrr/lib";
import { PopoverKind } from "~/download/graph/view/PopoverKind";
import type { PopoverRow } from "~/download/graph/view/PopoverRow";
import { formatNumber } from "~/download/labels/formatNumber";

// The report-line fields that are amounts or quantities. Dates, ids and codes are shown unchanged,
// so a tracking id never gets thousands separators.
const numericFields: string[] = [
	EDavkiProvenanceField.QUANTITY,
	EDavkiProvenanceField.PRICE_PER_UNIT,
	EDavkiProvenanceField.TOTAL_PRICE,
	EDavkiProvenanceField.COMMISSIONS,
	EDavkiProvenanceField.DIVIDEND_AMOUNT,
	EDavkiProvenanceField.FOREIGN_TAX_PAID,
];

// How a popover row's value is written: a report line's numbers rounded the locale's way, a broker
// row's attributes exactly like the export.
export function popoverValueText(row: PopoverRow, kind: PopoverKind, locale: string): string {
	if (kind === PopoverKind.LINE_VALUES && numericFields.includes(row.name)) {
		return formatNumber(row.value, locale);
	}
	return row.value;
}
