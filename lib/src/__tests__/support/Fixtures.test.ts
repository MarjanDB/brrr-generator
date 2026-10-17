import path from "node:path";
import { fixturePath, readFixture } from "@brrr/__tests__/support/Fixtures";

test("fixturePath is absolute and inside src", () => {
	const resolved = fixturePath("Brokerages");

	expect(path.isAbsolute(resolved)).toEqual(true);
	expect(resolved.endsWith(path.join("lib", "src", "Brokerages"))).toEqual(true);
});

test("readFixture reads a Flex Query", () => {
	const xml = readFixture("Brokerages/Ibkr/__tests__/Cases/SimpleStockTrade.xml");

	expect(xml).toContain("<FlexQueryResponse");
});
