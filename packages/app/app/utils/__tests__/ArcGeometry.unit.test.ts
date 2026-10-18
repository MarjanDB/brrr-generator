import { describe, expect, test } from "vitest";
import { arcGeometry, arcHit } from "~/utils/instrumentTimeline";

describe("the arc between a buy and a sale", () => {
	test("it starts and ends on the axis and its control point sits twice the rise above the middle", () => {
		const arc = arcGeometry(0, 100, 0, 10);

		expect(arc.start).toEqual({ x: 0, y: 0 });
		expect(arc.end).toEqual({ x: 100, y: 0 });
		expect(arc.control).toEqual({ x: 50, y: -20 });
	});

	test("a point at its apex is a hit", () => {
		const arc = arcGeometry(0, 100, 0, 10);

		expect(arcHit(arc, { x: 50, y: -10 }, 2)).toEqual(true);
	});

	test("a point far below its apex is not", () => {
		const arc = arcGeometry(0, 100, 0, 10);

		expect(arcHit(arc, { x: 50, y: 20 }, 2)).toEqual(false);
	});

	test("a point on the chord under the arc is not", () => {
		const arc = arcGeometry(0, 100, 0, 10);

		expect(arcHit(arc, { x: 50, y: 0 }, 2)).toEqual(false);
	});
});
