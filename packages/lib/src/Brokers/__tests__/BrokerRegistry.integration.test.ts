import { BrokerRegistry } from "@brrr/Brokers/BrokerRegistry";
import { createContainer } from "@brrr/Container";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import { TestKit } from "@brrr/test-cases";

const dividendsXml = TestKit.ibkr.dividends.inputs.simpleCashTransactionOfDividends.read().xml;

function registry(): BrokerRegistry {
	return createContainer(new PredefinedInfoProvider()).get(BrokerRegistry);
}

test("a valid export is detected without an error", () => {
	const [detection] = registry().detect([{ fileName: "ok.xml", xml: dividendsXml }]);

	expect(detection.detectedBroker?.id).toEqual("ibkr");
	expect(detection.error).toBeNull();
});

test("a Flex Query that fails to parse carries the parse error", () => {
	const damaged = dividendsXml.replace('type="Dividends"', 'type="Broker Interest Received"');

	const [detection] = registry().detect([{ fileName: "damaged.xml", xml: damaged }]);

	expect(detection.detectedBroker).toBeNull();
	expect(detection.error).toContain('"type"');
});

test("an unrelated file is not detected and is not an error", () => {
	const [detection] = registry().detect([{ fileName: "other.xml", xml: "<x/>" }]);

	expect(detection.detectedBroker).toBeNull();
	expect(detection.error).toBeNull();
});
