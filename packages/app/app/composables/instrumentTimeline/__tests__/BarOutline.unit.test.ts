import { describe, expect, test } from "vitest";
import { TimelineGeometry } from "~/composables/instrumentTimeline/timelineGeometry";
import { TimelineMarkKind } from "~/types/timeline";

describe("the shape of a lot on the timeline", () => {
	test("a buy then a sale: the bar with the buy's triangle out to the left at the bottom and the sale's out to the right at the top", () => {
		const shape = TimelineGeometry.barOutline(
			0,
			100,
			6,
			12,
			TimelineMarkKind.BOUGHT,
			TimelineMarkKind.SOLD,
		);

		expect(shape).toEqual([
			{ x: 0, y: 0 },
			{ x: 106, y: 0 },
			{ x: 100, y: 12 },
			{ x: -6, y: 12 },
		]);
	});

	test("a written option, a sale then a buy: the triangles stick out the other way", () => {
		const shape = TimelineGeometry.barOutline(
			0,
			100,
			6,
			12,
			TimelineMarkKind.SOLD,
			TimelineMarkKind.BOUGHT,
		);

		expect(shape).toEqual([
			{ x: -6, y: 0 },
			{ x: 100, y: 0 },
			{ x: 106, y: 12 },
			{ x: 0, y: 12 },
		]);
	});

	test("what is still open ends square", () => {
		const shape = TimelineGeometry.barOutline(0, 100, 6, 12, TimelineMarkKind.BOUGHT, null);

		expect(shape).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 12 },
			{ x: -6, y: 12 },
		]);
	});
});

describe("an outline around a shape, the same distance from every edge", () => {
	test("a rectangle grows by the distance on every side", () => {
		const outline = TimelineGeometry.offsetPolygon(
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 4 },
				{ x: 0, y: 4 },
			],
			2,
		);

		expect(outline).toEqual([
			{ x: -2, y: -2 },
			{ x: 12, y: -2 },
			{ x: 12, y: 6 },
			{ x: -2, y: 6 },
		]);
	});

	test("a lot's slanted ends move out along their own slant, 3 px from it", () => {
		const outline = TimelineGeometry.offsetPolygon(
			[
				{ x: 0, y: 0 },
				{ x: 106, y: 0 },
				{ x: 100, y: 12 },
				{ x: -6, y: 12 },
			],
			3,
		);

		expect(outline[0]?.x).toBeCloseTo(-1.854, 3);
		expect(outline[0]?.y).toBeCloseTo(-3, 3);
		expect(outline[1]?.x).toBeCloseTo(110.854, 3);
		expect(outline[1]?.y).toBeCloseTo(-3, 3);
		expect(outline[2]?.x).toBeCloseTo(101.854, 3);
		expect(outline[2]?.y).toBeCloseTo(15, 3);
		expect(outline[3]?.x).toBeCloseTo(-10.854, 3);
		expect(outline[3]?.y).toBeCloseTo(15, 3);
	});

	test("a corner repeated, as a lot opened and closed on the same day, is outlined once", () => {
		const outline = TimelineGeometry.offsetPolygon(
			[
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 4 },
				{ x: 0, y: 4 },
			],
			2,
		);

		expect(outline).toHaveLength(4);
		expect(outline[0]).toEqual({ x: -2, y: -2 });
	});
});
