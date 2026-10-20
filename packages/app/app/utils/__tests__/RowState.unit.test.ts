import { describe, expect, test } from "vitest";
import { MarkState } from "~/types/timeline";
import { rowStateAttributes } from "~/utils/rowState";

describe("how a row under the timeline shows the focus", () => {
	test("the focused item's row is selected and current", () => {
		const focused = rowStateAttributes(MarkState.FOCUSED);

		expect(focused.class).toEqual(
			"bg-accent-soft hover:bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent-edge)]",
		);
		expect(focused["aria-current"]).toEqual(true);
		expect(focused["data-selected"]).toEqual(true);
	});

	test("a row the focus lights, such as a lot of the focused sale, looks selected the same way, without being current", () => {
		const lit = rowStateAttributes(MarkState.LIT);

		expect(lit.class).toEqual(
			"bg-accent-soft hover:bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent-edge)]",
		);
		expect(lit["aria-current"]).toBeUndefined();
		expect(lit["data-selected"]).toEqual(true);
	});

	test("any other row is plain", () => {
		const normal = rowStateAttributes(MarkState.NORMAL);
		const dimmed = rowStateAttributes(MarkState.DIMMED);

		expect(normal.class).toEqual("");
		expect(normal["aria-current"]).toBeUndefined();
		expect(normal["data-selected"]).toBeUndefined();
		expect(dimmed.class).toEqual("");
		expect(dimmed["data-selected"]).toBeUndefined();
	});
});
