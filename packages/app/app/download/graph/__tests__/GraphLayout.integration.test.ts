import {
	createContainer,
	type ImportFile,
	PredefinedInfoProvider,
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	ProvenanceNodeKind,
	ProvenanceReportReader,
	ProvenanceWalker,
	type ReportInstrument,
	ReportPipeline,
	type ReportResult,
	SlovenianReportTypeId,
	TaxAuthorityId,
	TaxAuthorityLotMatchingMethod,
	TaxpayerConfigSchema,
	TaxpayerType,
	zDateTimeFromISOString,
} from "@brrr/lib";
import { TestKit } from "@brrr/test-cases";
import { assert, describe, expect, test } from "vitest";
import { CaptionSegmentKind } from "~/download/graph/CaptionSegmentKind";
import { captionOf } from "~/download/graph/caption";
import { GraphDirection } from "~/download/graph/GraphDirection";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { GraphLane } from "~/download/graph/GraphLane";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { layoutGraph } from "~/download/graph/layoutGraph";
import { SplitFactorKind } from "~/download/graph/SplitFactor";

// The taxpayer the expected files were generated for.
const taxpayer = TaxpayerConfigSchema.parse({
	taxNumber: "12345678",
	taxpayerType: TaxpayerType.NATURAL_PERSON,
	name: "Ime Priimek",
	address1: "Naslov 1",
	address2: null,
	city: "Ljubljana",
	postNumber: "1000",
	postName: "Ljubljana",
	municipalityName: "Ljubljana",
	birthDate: "1990-01-01",
	maticnaStevilka: "1234567",
	invalidskoPodjetje: false,
	resident: true,
	activityCode: "",
	activityName: "",
	countryId: "SI",
	countryName: "Slovenija",
});

// The wiring the site and the CLI use: read the exports once, then make one report from the import.
async function reportOf(
	inputs: ImportFile[],
	year: number,
	reportTypeId: SlovenianReportTypeId,
): Promise<ReportResult> {
	const pipeline = createContainer(new PredefinedInfoProvider()).get(ReportPipeline);
	const imported = pipeline.read(inputs);
	return await pipeline.generate(imported, {
		authorityId: TaxAuthorityId.SLOVENIA,
		reportTypeId,
		taxpayerInfo: taxpayer,
		reportConfig: {
			fromDate: zDateTimeFromISOString.parse(`${year}-01-01`),
			toDate: zDateTimeFromISOString.parse(`${year + 1}-01-01`),
			lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
		},
	});
}

function eventOfKind(instrument: ReportInstrument, kind: ProvenanceEventKind): ProvenanceNode {
	const item = instrument.events.find(
		(event) => event.node.fields[ProvenanceField.EVENT_KIND] === kind,
	);
	assert(item !== undefined);
	return item.node;
}

describe("the graph engine on what the stages really record", () => {
	test("a sale in the stock trade case reaches its pair from the export file", async () => {
		const stockTrade = TestKit.ibkr.stockTrade;
		const report = await reportOf(
			stockTrade.readInputs(),
			stockTrade.year,
			SlovenianReportTypeId.KDVP,
		);
		const reading = new ProvenanceReportReader().read(report.provenance);
		const share = reading.shares[0];
		assert(share !== undefined);
		const sale = eventOfKind(share, ProvenanceEventKind.SOLD);
		const model = new GraphIndex(report.provenance, reading).model(false);
		const file = report.provenance.nodes().find((node) => node.kind === ProvenanceNodeKind.FILE);
		assert(file !== undefined);

		const layout = layoutGraph(model, { focus: sale, expanded: new Set() });
		const caption = captionOf(layout);

		expect(
			layout.nodes.find((n) => n.node.source?.kind === ProvenanceNodeKind.GROUPING),
		).toBeUndefined();
		expect(layout.nodes.find((n) => n.node.kind === GraphNodeKind.PAIR)).toBeDefined();
		expect(layout.layoutNodeOf(file)?.column).toEqual(0);
		expect(layout.focus.column).toEqual(2);
		expect(layout.columns).toHaveLength(4);
		expect(layout.nodes).toHaveLength(7);
		expect(layout.edges).toHaveLength(6);
		expect(layout.lanes).toEqual([GraphLane.ACQUIRED, GraphLane.MIDDLE, GraphLane.SOLD]);
		expect(caption).toHaveLength(3);
		expect(caption[0]?.kind).toEqual(CaptionSegmentKind.FOCUS);
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.MATCHED_WITH);
		expect(caption[1]?.count).toEqual(1);
		expect(caption[1]?.opposite).toEqual(ProvenanceEventKind.ACQUIRED);
		expect(caption[2]?.kind).toEqual(CaptionSegmentKind.REPORT_LINES);
		expect(caption[2]?.count).toEqual(2);
	});

	test("every step of the same sale adds the record, the staging event, the legs and the lines", async () => {
		const stockTrade = TestKit.ibkr.stockTrade;
		const report = await reportOf(
			stockTrade.readInputs(),
			stockTrade.year,
			SlovenianReportTypeId.KDVP,
		);
		const reading = new ProvenanceReportReader().read(report.provenance);
		const share = reading.shares[0];
		assert(share !== undefined);
		const sale = eventOfKind(share, ProvenanceEventKind.SOLD);
		const model = new GraphIndex(report.provenance, reading).model(true);

		const layout = layoutGraph(model, { focus: sale, expanded: new Set() });

		expect(layout.nodes.find((n) => n.node.kind === GraphNodeKind.PAIR)).toBeUndefined();
		expect(layout.columns).toHaveLength(8);
		expect(layout.nodes).toHaveLength(13);
		expect(layout.edges).toHaveLength(12);
	});

	test("a split trade shows the factor on its edge, and the corporate action beside it as a stub", async () => {
		const split = TestKit.ibkr.split;
		const report = await reportOf(split.readInputs(), split.year, SlovenianReportTypeId.KDVP);
		const reading = new ProvenanceReportReader().read(report.provenance);
		const share = reading.shares[0];
		assert(share !== undefined);
		const rebuilt = share.events[0]?.node;
		assert(rebuilt !== undefined);
		const walker = new ProvenanceWalker(report.provenance);
		const before = walker
			.parents(rebuilt)
			.find((edge) => edge.from.kind === ProvenanceNodeKind.EVENT)?.from;
		const action = walker
			.parents(rebuilt)
			.find((edge) => edge.from.kind === ProvenanceNodeKind.CORPORATE_ACTION)?.from;
		assert(before !== undefined);
		assert(action !== undefined);
		const model = new GraphIndex(report.provenance, reading).model(false);

		const layout = layoutGraph(model, { focus: before, expanded: new Set() });
		const splitEdge = layout.edges.find((edge) => edge.split !== null);

		expect(splitEdge?.from.node.source).toBe(before);
		expect(splitEdge?.to.node.source).toBe(rebuilt);
		expect(splitEdge?.split?.kind).toEqual(SplitFactorKind.MULTIPLY);
		expect(splitEdge?.split?.amount).toEqual(10);
		expect(layout.layoutNodeOf(action)?.isStub).toEqual(true);
		expect(layout.layoutNodeOf(action)?.direction).toEqual(GraphDirection.UP);
		expect(layout.layoutNodeOf(action)?.column).toEqual(2);
		expect(layout.layoutNodeOf(before)?.column).toEqual(2);
		expect(layout.layoutNodeOf(rebuilt)?.column).toEqual(3);
		expect(layout.columns).toHaveLength(5);
		expect(layout.nodes).toHaveLength(8);
		expect(layout.edges).toHaveLength(7);
	});

	test("a day's dividend sum has no pair, and the dividend and its withholding sit in different lanes", async () => {
		const dividends = TestKit.ibkr.dividends;
		const report = await reportOf(
			dividends.readInputs(),
			dividends.year,
			SlovenianReportTypeId.DIV,
		);
		const reading = new ProvenanceReportReader().read(report.provenance);
		const payer = reading.dividendPayers[0];
		assert(payer !== undefined);
		const line = payer.lines[0];
		assert(line !== undefined);
		const daySum = new ProvenanceWalker(report.provenance).parents(line)[0]?.from;
		assert(daySum !== undefined);
		const model = new GraphIndex(report.provenance, reading).model(false);

		const layout = layoutGraph(model, { focus: daySum, expanded: new Set() });

		expect(layout.nodes.find((n) => n.node.kind === GraphNodeKind.PAIR)).toBeUndefined();
		expect(layout.layoutNodeOf(eventOfKind(payer, ProvenanceEventKind.DIVIDEND))?.lane).toEqual(
			GraphLane.ACQUIRED,
		);
		expect(
			layout.layoutNodeOf(eventOfKind(payer, ProvenanceEventKind.WITHHOLDING_TAX))?.lane,
		).toEqual(GraphLane.SOLD);
		expect(layout.layoutNodeOf(line)?.column).toEqual(5);
		expect(layout.columns).toHaveLength(6);
		expect(layout.nodes).toHaveLength(8);
		expect(layout.edges).toHaveLength(8);
	});

	test("an option contract's matched lot is a pair like a share's", async () => {
		const optionTrade = TestKit.ibkr.optionTrade;
		const report = await reportOf(
			optionTrade.readInputs(),
			optionTrade.year,
			SlovenianReportTypeId.IFI,
		);
		const reading = new ProvenanceReportReader().read(report.provenance);
		const contract = reading.optionUnderlyings[0]?.contracts[0];
		assert(contract !== undefined);
		const lot = contract.matchedLots[0]?.node;
		assert(lot !== undefined);
		const model = new GraphIndex(report.provenance, reading).model(false);

		const layout = layoutGraph(model, { focus: lot, expanded: new Set() });

		expect(layout.focus.node.kind).toEqual(GraphNodeKind.PAIR);
		expect(layout.focus.column).toEqual(3);
		expect(layout.nodes).toHaveLength(7);
		expect(layout.edges).toHaveLength(7);
	});

	test("a trade read from two downloads shows both rows and both files", async () => {
		const overlapping = TestKit.ibkr.overlappingExports;
		const report = await reportOf(
			overlapping.readInputs(),
			overlapping.year,
			SlovenianReportTypeId.KDVP,
		);
		const reading = new ProvenanceReportReader().read(report.provenance);
		const share = reading.shares[0];
		assert(share !== undefined);
		const sale = eventOfKind(share, ProvenanceEventKind.SOLD);
		const model = new GraphIndex(report.provenance, reading).model(false);

		const layout = layoutGraph(model, { focus: sale, expanded: new Set() });
		const rows = layout.nodes.filter((n) => n.node.kind === GraphNodeKind.ROW && !n.isStub);
		const files = layout.nodes.filter((n) => n.node.kind === GraphNodeKind.FILE);

		expect(rows).toHaveLength(2);
		expect(files).toHaveLength(2);
		expect(files[0]?.isStub).toEqual(false);
		expect(files[1]?.isStub).toEqual(false);
		expect(layout.nodes).toHaveLength(11);
		expect(layout.edges).toHaveLength(10);
	});
});
