import { describe, expect, test } from "vitest";
import { EdgeCurves } from "~/composables/provenanceGraph/edgeCurves";

describe("the curve the graph's edges and the landing page's arrows draw", () => {
	test("a long hop bends halfway across", () => {
		const path = EdgeCurves.between({ x: 0, y: 10 }, { x: 100, y: 50 });

		expect(path).toEqual("M0,10 C50,10 50,50 100,50");
	});

	test("a short hop still bends 24px out of each end", () => {
		const path = EdgeCurves.between({ x: 0, y: 10 }, { x: 20, y: 30 });

		expect(path).toEqual("M0,10 C24,10 -4,30 20,30");
	});
});
