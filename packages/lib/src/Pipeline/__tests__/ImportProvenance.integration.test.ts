import { renderProvenance } from "@brrr/__tests__/support/ProvenanceSnapshot";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TestKit } from "@brrr/test-cases";

// What reading each test case's inputs recorded: every file, row and object, and why anything was dropped.
test("Ibkr/StockTrade", async () => {
	const stockTrade = TestKit.ibkr.stockTrade;

	const imported = Scenario.pipeline.run(stockTrade.readInputs());

	await expect(renderProvenance(imported.provenance)).toMatchFileSnapshot(
		stockTrade.expected.importProvenancePath,
	);
});

test("Ibkr/OptionTrade", async () => {
	const optionTrade = TestKit.ibkr.optionTrade;

	const imported = Scenario.pipeline.run(optionTrade.readInputs());

	await expect(renderProvenance(imported.provenance)).toMatchFileSnapshot(
		optionTrade.expected.importProvenancePath,
	);
});

test("Ibkr/Dividends", async () => {
	const dividends = TestKit.ibkr.dividends;

	const imported = Scenario.pipeline.run(dividends.readInputs());

	await expect(renderProvenance(imported.provenance)).toMatchFileSnapshot(
		dividends.expected.importProvenancePath,
	);
});

test("Ibkr/PaymentInLieuOfDividends", async () => {
	const paymentInLieu = TestKit.ibkr.paymentInLieuOfDividends;

	const imported = Scenario.pipeline.run(paymentInLieu.readInputs());

	await expect(renderProvenance(imported.provenance)).toMatchFileSnapshot(
		paymentInLieu.expected.importProvenancePath,
	);
});

test("Ibkr/DuplicatingTrades", async () => {
	const duplicatingTrades = TestKit.ibkr.duplicatingTrades;

	const imported = Scenario.pipeline.run(duplicatingTrades.readInputs());

	await expect(renderProvenance(imported.provenance)).toMatchFileSnapshot(
		duplicatingTrades.expected.importProvenancePath,
	);
});

test("Ibkr/Split", async () => {
	const split = TestKit.ibkr.split;

	const imported = Scenario.pipeline.run(split.readInputs());

	await expect(renderProvenance(imported.provenance)).toMatchFileSnapshot(
		split.expected.importProvenancePath,
	);
});

test("Ibkr/OverlappingExports", async () => {
	const overlappingExports = TestKit.ibkr.overlappingExports;

	const imported = Scenario.pipeline.run(overlappingExports.readInputs());

	await expect(renderProvenance(imported.provenance)).toMatchFileSnapshot(
		overlappingExports.expected.importProvenancePath,
	);
});
