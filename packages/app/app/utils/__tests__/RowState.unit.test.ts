import { describe, expect, test } from "vitest";
import { MarkState } from "~/types/timeline";
import { RowStates } from "~/utils/rowStates";

describe("how a row under the timeline shows the focus", () => {
	test("the focused item's row is selected and current", () => {
		const focused = RowStates.attributesOf(MarkState.FOCUSED);

		expect(focused.class).toEqual("row-selected");
		expect(focused["aria-current"]).toEqual(true);
		expect(focused["data-selected"]).toEqual(true);
	});

	test("a row the focus lights, such as a lot of the focused sale, looks selected the same way, without being current", () => {
		const lit = RowStates.attributesOf(MarkState.LIT);

		expect(lit.class).toEqual("row-selected");
		expect(lit["aria-current"]).toBeUndefined();
		expect(lit["data-selected"]).toEqual(true);
	});

	test("any other row is plain", () => {
		const normal = RowStates.attributesOf(MarkState.NORMAL);
		const dimmed = RowStates.attributesOf(MarkState.DIMMED);

		expect(normal.class).toEqual("");
		expect(normal["aria-current"]).toBeUndefined();
		expect(normal["data-selected"]).toBeUndefined();
		expect(dimmed.class).toEqual("");
		expect(dimmed["data-selected"]).toBeUndefined();
	});
});
