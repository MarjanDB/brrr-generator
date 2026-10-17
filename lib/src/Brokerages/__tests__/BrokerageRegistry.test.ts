import { readFixture } from "@brrr/__tests__/support/Fixtures";
import { BrokerageRegistry } from "@brrr/Brokerages/BrokerageRegistry";
import { createContainer } from "@brrr/container";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";

const DIVIDENDS = "Brokerages/Ibkr/__tests__/Cases/SimpleCashTransactionOfDividends.xml";

function registry(): BrokerageRegistry {
	return createContainer(new PredefinedInfoProvider()).get(BrokerageRegistry);
}

test("a valid export is detected without an error", () => {
	const [detection] = registry().detect([{ fileName: "ok.xml", xml: readFixture(DIVIDENDS) }]);

	expect(detection.detectedBrokerage?.id).toEqual("ibkr");
	expect(detection.error).toBeNull();
});

test("a Flex Query that fails to parse carries the parse error", () => {
	const damaged = readFixture(DIVIDENDS).replace(
		'type="Dividends"',
		'type="Broker Interest Received"',
	);

	const [detection] = registry().detect([{ fileName: "damaged.xml", xml: damaged }]);

	expect(detection.detectedBrokerage).toBeNull();
	expect(detection.error).toContain('"type"');
});

test("an unrelated file is not detected and is not an error", () => {
	const [detection] = registry().detect([{ fileName: "other.xml", xml: "<x/>" }]);

	expect(detection.detectedBrokerage).toBeNull();
	expect(detection.error).toBeNull();
});
