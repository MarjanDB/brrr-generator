import { EDavkiProvenanceField } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { PopoverKind } from "~/download/graph/view/PopoverKind";
import { PopoverRow } from "~/download/graph/view/PopoverRow";
import { popoverValueText } from "~/download/graph/view/popoverValueText";

describe("a value in the popover", () => {
	test("a report line's amount is rounded and written the locale's way", () => {
		const row = new PopoverRow({
			name: EDavkiProvenanceField.COMMISSIONS,
			nameKey: "download_edavki_field_commissions",
			value: "-0.6966666666666667",
		});

		expect(popoverValueText(row, PopoverKind.LINE_VALUES, "sl")).toEqual("−0,696667");
	});

	test("a report line's tracking id is shown unchanged, with no thousands separators", () => {
		const row = new PopoverRow({
			name: EDavkiProvenanceField.TRACKING_ID,
			nameKey: "download_edavki_field_tracking_id",
			value: "102869793",
		});

		expect(popoverValueText(row, PopoverKind.LINE_VALUES, "en")).toEqual("102869793");
	});

	test("a broker row's attribute is shown exactly like the export", () => {
		const row = new PopoverRow({ name: "tradePrice", nameKey: null, value: "8.020000001" });

		expect(popoverValueText(row, PopoverKind.ROW_ATTRIBUTES, "en")).toEqual("8.020000001");
	});
});
