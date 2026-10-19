import { describe, expect, test } from "vitest";
import { landingArrowsOf } from "~/utils/landingArrows";

describe("the landing page's arrows, from the brokers into the mark and out to the tax offices", () => {
	test("one broker and one tax office get one straight arrow each, at the mark's middle", () => {
		const arrows = landingArrowsOf({
			mark: { x: 300, y: 100, width: 132, height: 132 },
			brokers: [{ x: 0, y: 136, width: 250, height: 60 }],
			offices: [{ x: 532, y: 116, width: 290, height: 100 }],
		});

		expect(arrows.brokers).toHaveLength(1);
		expect(arrows.brokers[0]?.from).toEqual({ x: 250, y: 166 });
		expect(arrows.brokers[0]?.to).toEqual({ x: 296, y: 166 });
		expect(arrows.brokers[0]?.line).toEqual("M250,166 C274,166 272,166 296,166");
		expect(arrows.brokers[0]?.head).toEqual("M288,161 L297,166 L288,171 Z");
		expect(arrows.offices).toHaveLength(1);
		expect(arrows.offices[0]?.from).toEqual({ x: 435, y: 166 });
		expect(arrows.offices[0]?.to).toEqual({ x: 528, y: 166 });
		expect(arrows.offices[0]?.line).toEqual("M435,166 C481.5,166 481.5,166 528,166");
		expect(arrows.offices[0]?.head).toEqual("M520,161 L529,166 L520,171 Z");
	});

	test("three brokers each meet the mark at their own point, 22px apart around its middle", () => {
		const arrows = landingArrowsOf({
			mark: { x: 300, y: 100, width: 132, height: 132 },
			brokers: [
				{ x: 0, y: 60, width: 250, height: 60 },
				{ x: 0, y: 136, width: 250, height: 60 },
				{ x: 0, y: 212, width: 250, height: 60 },
			],
			offices: [{ x: 532, y: 116, width: 290, height: 100 }],
		});

		expect(arrows.brokers[0]?.from).toEqual({ x: 250, y: 90 });
		expect(arrows.brokers[0]?.to).toEqual({ x: 296, y: 144 });
		expect(arrows.brokers[1]?.from).toEqual({ x: 250, y: 166 });
		expect(arrows.brokers[1]?.to).toEqual({ x: 296, y: 166 });
		expect(arrows.brokers[2]?.from).toEqual({ x: 250, y: 242 });
		expect(arrows.brokers[2]?.to).toEqual({ x: 296, y: 188 });
	});

	test("two tax offices each leave the mark at their own point and end at their card", () => {
		const arrows = landingArrowsOf({
			mark: { x: 300, y: 100, width: 132, height: 132 },
			brokers: [{ x: 0, y: 136, width: 250, height: 60 }],
			offices: [
				{ x: 532, y: 50, width: 290, height: 100 },
				{ x: 532, y: 160, width: 290, height: 100 },
			],
		});

		expect(arrows.offices[0]?.from).toEqual({ x: 435, y: 155 });
		expect(arrows.offices[0]?.to).toEqual({ x: 528, y: 100 });
		expect(arrows.offices[1]?.from).toEqual({ x: 435, y: 177 });
		expect(arrows.offices[1]?.to).toEqual({ x: 528, y: 210 });
	});

	test("many brokers close up to fit the middle 60% of the mark", () => {
		const arrows = landingArrowsOf({
			mark: { x: 300, y: 100, width: 100, height: 100 },
			brokers: [
				{ x: 0, y: 0, width: 250, height: 40 },
				{ x: 0, y: 50, width: 250, height: 40 },
				{ x: 0, y: 100, width: 250, height: 40 },
				{ x: 0, y: 150, width: 250, height: 40 },
				{ x: 0, y: 200, width: 250, height: 40 },
			],
			offices: [{ x: 500, y: 100, width: 290, height: 100 }],
		});

		expect(arrows.brokers[0]?.to).toEqual({ x: 296, y: 120 });
		expect(arrows.brokers[1]?.to).toEqual({ x: 296, y: 135 });
		expect(arrows.brokers[2]?.to).toEqual({ x: 296, y: 150 });
		expect(arrows.brokers[3]?.to).toEqual({ x: 296, y: 165 });
		expect(arrows.brokers[4]?.to).toEqual({ x: 296, y: 180 });
	});
});
