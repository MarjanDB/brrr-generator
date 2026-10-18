import { describe, expect, test } from "vitest";
import { popoverPosition } from "~/utils/graphLayout";

describe("where a popover opens", () => {
	test("it opens to the right of its node when there is room", () => {
		const position = popoverPosition({
			anchorX: 100,
			anchorY: 50,
			anchorWidth: 160,
			popoverWidth: 260,
			popoverHeight: 100,
			canvasWidth: 1000,
			canvasHeight: 400,
			scale: 1,
			shift: 0,
		});

		expect(position.x).toEqual(274);
		expect(position.y).toEqual(50);
	});

	test("it opens to the left when the right side would pass the canvas", () => {
		const position = popoverPosition({
			anchorX: 700,
			anchorY: 50,
			anchorWidth: 160,
			popoverWidth: 260,
			popoverHeight: 100,
			canvasWidth: 1000,
			canvasHeight: 400,
			scale: 1,
			shift: 0,
		});

		expect(position.x).toEqual(426);
		expect(position.y).toEqual(50);
	});

	test("it moves up when its bottom would pass the canvas", () => {
		const position = popoverPosition({
			anchorX: 100,
			anchorY: 350,
			anchorWidth: 160,
			popoverWidth: 260,
			popoverHeight: 100,
			canvasWidth: 1000,
			canvasHeight: 400,
			scale: 1,
			shift: 0,
		});

		expect(position.x).toEqual(274);
		expect(position.y).toEqual(300);
	});

	test("the scale and the shift of the graph are applied to the anchor", () => {
		const position = popoverPosition({
			anchorX: 100,
			anchorY: 50,
			anchorWidth: 160,
			popoverWidth: 260,
			popoverHeight: 100,
			canvasWidth: 1000,
			canvasHeight: 400,
			scale: 0.5,
			shift: 40,
		});

		expect(position.x).toEqual(177);
		expect(position.y).toEqual(25);
	});
});
