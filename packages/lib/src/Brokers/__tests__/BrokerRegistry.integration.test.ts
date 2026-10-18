import { BrokerRegistry } from "@brrr/Brokers/BrokerRegistry";
import { IbkrBrokerExportProvider } from "@brrr/Brokers/Ibkr/IbkrBrokerExportProvider";
import { IbkrExtractService } from "@brrr/Brokers/Ibkr/Services/IbkrExtractService";
import { IbkrTransformService } from "@brrr/Brokers/Ibkr/Services/IbkrTransformService";
import { createContainer } from "@brrr/Container";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/Predefined/PredefinedInfoProvider";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { TestKit } from "@brrr/test-cases";

const dividendsXml = TestKit.ibkr.dividends.inputs.simpleCashTransactionOfDividends.read().xml;

function registry(): BrokerRegistry {
	return createContainer(new PredefinedInfoProvider()).get(BrokerRegistry);
}

test("a valid export is detected without an error, and its file is recorded", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const file = { fileName: "ok.xml", xml: dividendsXml };

	const { detections } = registry().load([file], graph);

	expect(detections[0].detectedBroker?.id).toEqual("ibkr");
	expect(detections[0].error).toBeNull();
	expect(graph.nodeOf(file).kind).toEqual(ProvenanceNodeKind.FILE);
	expect(graph.nodeOf(file).label).toEqual("ok.xml");
	expect(graph.drops()).toEqual([]);
});

test("a Flex Query that fails to parse carries the parse error, and its file is dropped as unreadable", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const damaged = dividendsXml.replace('type="Dividends"', 'type="Broker Interest Received"');
	const file = { fileName: "damaged.xml", xml: damaged };

	const { detections } = registry().load([file], graph);

	expect(detections[0].detectedBroker).toBeNull();
	expect(detections[0].error).toContain('"type"');
	expect(graph.drops()).toHaveLength(1);
	expect(graph.drops()[0].node).toBe(graph.nodeOf(file));
	expect(graph.drops()[0].reason).toEqual(DropReason.UNREADABLE);
	expect(graph.drops()[0].detail).toContain('"type"');
});

test("an unrelated file is not detected, is not an error, and is dropped as not recognised", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const file = { fileName: "other.xml", xml: "<x/>" };

	const { detections, stagingEvents } = registry().load([file], graph);

	expect(detections[0].detectedBroker).toBeNull();
	expect(detections[0].error).toBeNull();
	expect(stagingEvents.groupings).toEqual([]);
	expect(graph.drops()).toHaveLength(1);
	expect(graph.drops()[0].reason).toEqual(DropReason.NOT_RECOGNISED);
	expect(graph.drops()[0].detail).toBeNull();
});

test("each file is parsed once", () => {
	const extract = new IbkrExtractService();
	const parse = vi.spyOn(extract, "extractFromXML");
	const registry = new BrokerRegistry(
		new IbkrBrokerExportProvider(extract, new IbkrTransformService()),
	);

	registry.load([{ fileName: "ok.xml", xml: dividendsXml }], new NullProvenanceRecorder());

	expect(parse).toHaveBeenCalledTimes(1);
});
