import { describe, expect, test } from "vitest";
import { LandingConnectorAnchor, LandingSide } from "~/types/landing";
import { landingConnectorOf } from "~/utils/landingConnectors";

describe("the connector beside each landing card, from its middle to its own point on the mark", () => {
	test("the only card on a side meets the mark's middle with a level line", () => {
		const connector = landingConnectorOf(LandingSide.BROKER, 0, 1);

		expect(connector.level).toEqual(true);
		expect(connector.anchor).toEqual(LandingConnectorAnchor.TOP);
		expect(connector.height).toEqual("2px");
		expect(connector.curve).toEqual("M0,50 L100,50");
	});

	test("the top one of three brokers runs down from its middle to a point 22px above the mark's middle", () => {
		const connector = landingConnectorOf(LandingSide.BROKER, 0, 3);

		expect(connector.level).toEqual(false);
		expect(connector.anchor).toEqual(LandingConnectorAnchor.TOP);
		expect(connector.height).toEqual("calc(1 * 100% - 12px)");
		expect(connector.leftEndAtTop).toEqual(true);
		expect(connector.curve).toEqual("M0,0 C50,0 50,100 100,100");
	});

	test("the middle one of three brokers is level", () => {
		const connector = landingConnectorOf(LandingSide.BROKER, 1, 3);

		expect(connector.level).toEqual(true);
	});

	test("the bottom one of three brokers runs up from its middle", () => {
		const connector = landingConnectorOf(LandingSide.BROKER, 2, 3);

		expect(connector.anchor).toEqual(LandingConnectorAnchor.BOTTOM);
		expect(connector.height).toEqual("calc(1 * 100% - 12px)");
		expect(connector.leftEndAtTop).toEqual(false);
		expect(connector.curve).toEqual("M0,100 C50,100 50,0 100,0");
	});

	test("the upper of two tax offices is reached from a point below it, on the mark's right", () => {
		const connector = landingConnectorOf(LandingSide.OFFICE, 0, 2);

		expect(connector.anchor).toEqual(LandingConnectorAnchor.TOP);
		expect(connector.height).toEqual("calc(0.5 * 100% - 6px)");
		expect(connector.leftEndAtTop).toEqual(false);
	});

	test("the lower of two tax offices is reached from a point above it", () => {
		const connector = landingConnectorOf(LandingSide.OFFICE, 1, 2);

		expect(connector.anchor).toEqual(LandingConnectorAnchor.BOTTOM);
		expect(connector.height).toEqual("calc(0.5 * 100% - 6px)");
		expect(connector.leftEndAtTop).toEqual(true);
	});

	test("five brokers close up to fit the middle 60% of the mark, 19.8px apart", () => {
		const connector = landingConnectorOf(LandingSide.BROKER, 0, 5);

		expect(connector.height).toEqual("calc(2 * 100% - 19.6px)");
	});
});
