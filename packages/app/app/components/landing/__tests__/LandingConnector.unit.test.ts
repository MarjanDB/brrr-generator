import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";
import LandingConnector from "~/components/landing/LandingConnector.vue";
import { LandingSide } from "~/types/landing";

// The arrow's box, its curve and its head, as the connector renders them.
async function mountConnector(side: LandingSide, index: number, count: number) {
	const wrapper = await mountSuspended(LandingConnector, { props: { side, index, count } });
	const box = wrapper.find("div").element;
	const [curve, head] = wrapper.findAll("svg");
	return {
		box: box instanceof HTMLElement ? box.style : null,
		curve: curve?.find("path").attributes("d"),
		head: head?.element instanceof SVGElement ? head.element.style : null,
	};
}

describe("the connector beside each landing card, from its middle to its own point on the mark", () => {
	test("the only card on a side meets the mark's middle with a level line", async () => {
		const connector = await mountConnector(LandingSide.BROKER, 0, 1);

		expect(connector.box?.top).toEqual("calc(50% - 1px)");
		expect(connector.box?.height).toEqual("2px");
		expect(connector.curve).toEqual("M0,50 L100,50");
		expect(connector.head?.top).toEqual("calc(50% - 5px)");
	});

	test("the top one of three brokers runs down from its middle to a point 22px above the mark's middle", async () => {
		const connector = await mountConnector(LandingSide.BROKER, 0, 3);

		expect(connector.box?.top).toEqual("50%");
		expect(connector.box?.bottom).toEqual("");
		expect(connector.box?.height).toEqual("calc(1 * 100% - 12px)");
		expect(connector.curve).toEqual("M0,0 C50,0 50,100 100,100");
		expect(connector.head?.top).toEqual("calc(100% - 5px)");
	});

	test("the middle one of three brokers is level", async () => {
		const connector = await mountConnector(LandingSide.BROKER, 1, 3);

		expect(connector.curve).toEqual("M0,50 L100,50");
	});

	test("the bottom one of three brokers runs up from its middle", async () => {
		const connector = await mountConnector(LandingSide.BROKER, 2, 3);

		expect(connector.box?.top).toEqual("");
		expect(connector.box?.bottom).toEqual("50%");
		expect(connector.box?.height).toEqual("calc(1 * 100% - 12px)");
		expect(connector.curve).toEqual("M0,100 C50,100 50,0 100,0");
		expect(connector.head?.top).toEqual("-5px");
	});

	test("the upper of two tax offices is reached from a point below it, on the mark's right", async () => {
		const connector = await mountConnector(LandingSide.OFFICE, 0, 2);

		expect(connector.box?.top).toEqual("50%");
		expect(connector.box?.height).toEqual("calc(0.5 * 100% - 6px)");
		expect(connector.curve).toEqual("M0,100 C50,100 50,0 100,0");
		expect(connector.head?.top).toEqual("-5px");
	});

	test("the lower of two tax offices is reached from a point above it", async () => {
		const connector = await mountConnector(LandingSide.OFFICE, 1, 2);

		expect(connector.box?.bottom).toEqual("50%");
		expect(connector.box?.height).toEqual("calc(0.5 * 100% - 6px)");
		expect(connector.curve).toEqual("M0,0 C50,0 50,100 100,100");
		expect(connector.head?.top).toEqual("calc(100% - 5px)");
	});

	test("five brokers close up to fit the middle 60% of the mark, 19.8px apart", async () => {
		const connector = await mountConnector(LandingSide.BROKER, 0, 5);

		expect(connector.box?.height).toEqual("calc(2 * 100% - 19.6px)");
	});
});
