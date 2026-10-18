import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { createContainer } from "@brrr/Container";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/Predefined/PredefinedInfoProvider";
import { ReportPipeline, type ReportRequest } from "@brrr/Pipeline/ReportPipeline";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";
import { TaxAuthorityId } from "@brrr/TaxAuthorities/Models/TaxAuthorityIdentifiers";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianReportTypeId";
import { TestKit } from "@brrr/test-cases";

function pipeline(): ReportPipeline {
	return createContainer(Scenario.config.infoProvider(Fixtures.lookups)).get(ReportPipeline);
}

const request: ReportRequest = {
	authorityId: TaxAuthorityId.SLOVENIA,
	reportTypeId: SlovenianReportTypeId.KDVP,
	taxpayerInfo: Fixtures.taxpayer,
	reportConfig: Scenario.config.report(2022, TaxAuthorityLotMatchingMethod.FIFO),
};

test("read returns the import's events and the graph of where they came from", () => {
	const imported = pipeline().read(TestKit.ibkr.stockTrade.readInputs());

	expect(imported.events.groupings).toHaveLength(1);
	expect(new ProvenanceWalker(imported.provenance).inputs()[0].label).toEqual(
		"SimpleStockTrade.xml",
	);
});

test("generate returns the report with a layer on the import's graph", async () => {
	const imported = pipeline().read(TestKit.ibkr.stockTrade.readInputs());

	const report = await pipeline().generate(imported, request);

	expect(report.xml).toContain("<?xml");
	expect(new ProvenanceWalker(report.provenance).inputs()[0].label).toEqual("SimpleStockTrade.xml");
	expect(() => imported.provenance.node({}, ProvenanceNodeKind.FILE, "late.xml", {})).toThrow(
		"Provenance: this graph has layers; record into a layer instead",
	);
});

test("two reports from one import get separate layers", async () => {
	const imported = pipeline().read(TestKit.ibkr.stockTrade.readInputs());

	const first = await pipeline().generate(imported, request);
	const second = await pipeline().generate(imported, request);

	expect(first.provenance).not.toBe(second.provenance);
});

test("an import with no broker files reads as empty", () => {
	const imported = createContainer(new PredefinedInfoProvider())
		.get(ReportPipeline)
		.read([{ fileName: "notes.xml", xml: "<x/>" }]);

	expect(imported.events.groupings).toEqual([]);
	expect(imported.provenance.drops()[0].reason).toEqual(DropReason.NOT_RECOGNISED);
});
