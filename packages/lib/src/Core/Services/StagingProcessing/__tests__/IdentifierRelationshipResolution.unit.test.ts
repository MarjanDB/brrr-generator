import { Scenario } from "@brrr/__tests__/support/Scenario";
import { IbkrExtractService } from "@brrr/Brokers/Ibkr/Services/IbkrExtractService";
import { IbkrTransformService } from "@brrr/Brokers/Ibkr/Services/IbkrTransformService";
import type { ImportFile } from "@brrr/Brokers/Models/ImportFile";
import { CorrelationKey, Isin, Ticker } from "@brrr/Core/Models/Identifiers";
import { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import { StagingIdentifierRelationship } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationship";
import { StagingIdentifierRelationshipPartial } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartial";
import { StagingIdentifierRelationshipPartialWithQuantity } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartialWithQuantity";
import { StagingIdentifierRelationshipSplit } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipSplit";
import { StagingIdentifierRelationships } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationships";
import { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";
import { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import { IdentifierRelationshipResolution } from "@brrr/Core/Services/StagingProcessing/IdentifierRelationshipResolution";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";
import { TestKit } from "@brrr/test-cases";

test("two partials same key produce one full relationship", () => {
	const fromId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old Inc",
	});
	const toId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New Inc",
	});
	const partials: StagingIdentifierRelationshipPartial[] = [
		new StagingIdentifierRelationshipPartial({
			fromIdentifier: fromId,
			toIdentifier: null,
			correlationKey: CorrelationKey.Schema.parse("action-1"),
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: Scenario.build.date("2024-10-01"),
		}),
		new StagingIdentifierRelationshipPartial({
			fromIdentifier: null,
			toIdentifier: toId,
			correlationKey: CorrelationKey.Schema.parse("action-1"),
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: Scenario.build.date("2024-10-01"),
		}),
	];
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(
		partials,
		new NullProvenanceRecorder(),
	);
	expect(result.length).toEqual(1);
	expect(result[0].fromIdentifier.isin).toEqual("US111");
	expect(result[0].toIdentifier.isin).toEqual("US222");
	expect(result[0].changeType).toEqual(StagingIdentifierChangeType.SPLIT);
	expect(result[0].effectiveDate !== null).toEqual(true);
});

test("partials with quantity produce full with quantityBefore/quantityAfter", () => {
	const fromId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US86800U1043"),
		ticker: Ticker.Schema.parse("SMCI.OLD"),
		name: "Old",
	});
	const toId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US86800U3023"),
		ticker: Ticker.Schema.parse("SMCI"),
		name: "New",
	});
	const partials: StagingIdentifierRelationshipPartialWithQuantity[] = [
		new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: fromId,
			toIdentifier: null,
			correlationKey: CorrelationKey.Schema.parse("action-1"),
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: Scenario.build.date("2024-09-30"),
			quantity: 4.0,
		}),
		new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: null,
			toIdentifier: toId,
			correlationKey: CorrelationKey.Schema.parse("action-1"),
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: Scenario.build.date("2024-09-30"),
			quantity: 40.0,
		}),
	];
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(
		partials,
		new NullProvenanceRecorder(),
	);
	expect(result.length).toEqual(1);
	expect(result[0]).toBeInstanceOf(StagingIdentifierRelationshipSplit);
	expect(result[0]).toMatchObject({
		quantityBefore: 4.0,
		quantityAfter: 40.0,
		changeType: StagingIdentifierChangeType.SPLIT,
	});
});

test("reverse split inferred when quantity after less than before", () => {
	const fromId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const toId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const partials: StagingIdentifierRelationshipPartialWithQuantity[] = [
		new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: fromId,
			toIdentifier: null,
			correlationKey: CorrelationKey.Schema.parse("rev-1"),
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: Scenario.build.date("2024-10-01"),
			quantity: 10.0,
		}),
		new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: null,
			toIdentifier: toId,
			correlationKey: CorrelationKey.Schema.parse("rev-1"),
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: Scenario.build.date("2024-10-01"),
			quantity: 1.0,
		}),
	];
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(
		partials,
		new NullProvenanceRecorder(),
	);
	expect(result.length).toEqual(1);
	expect(result[0]).toBeInstanceOf(StagingIdentifierRelationshipSplit);
	expect(result[0]).toMatchObject({
		changeType: StagingIdentifierChangeType.REVERSE_SPLIT,
		quantityBefore: 10.0,
		quantityAfter: 1.0,
	});
});

test("only from partial produces no full relationship", () => {
	const fromId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const partials: StagingIdentifierRelationshipPartial[] = [
		new StagingIdentifierRelationshipPartial({
			fromIdentifier: fromId,
			toIdentifier: null,
			correlationKey: CorrelationKey.Schema.parse("action-1"),
			changeType: StagingIdentifierChangeType.RENAME,
			effectiveDate: Scenario.build.date("2024-01-01"),
		}),
	];
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(
		partials,
		new NullProvenanceRecorder(),
	);
	expect(result.length).toEqual(0);
});

test("empty partials returns empty", () => {
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(
		[],
		new NullProvenanceRecorder(),
	);
	expect(result.length).toEqual(0);
});

test("preserves existing full relationships", () => {
	const fromId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("A"),
		name: "A",
	});
	const toId = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("B"),
		name: "B",
	});
	const events = new StagingFinancialEvents({
		groupings: [],
		identifierRelationships: new StagingIdentifierRelationships({
			relationships: [
				new StagingIdentifierRelationship({
					fromIdentifier: fromId,
					toIdentifier: toId,
					changeType: StagingIdentifierChangeType.RENAME,
					effectiveDate: null,
				}),
			],
			partialRelationships: [],
		}),
	});
	const result =
		new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(
			events,
			new NullProvenanceRecorder(),
		);
	expect(result.identifierRelationships.relationships.length).toEqual(1);
	expect(result.identifierRelationships.relationships[0].fromIdentifier.isin).toEqual("US111");
	expect(result.identifierRelationships.partialRelationships.length).toEqual(0);
});

test("resolution returns a StagingFinancialEvents instance", () => {
	const events = new StagingFinancialEvents({
		groupings: [],
		identifierRelationships: new StagingIdentifierRelationships({
			relationships: [],
			partialRelationships: [],
		}),
	});

	const result =
		new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(
			events,
			new NullProvenanceRecorder(),
		);

	expect(result).toBeInstanceOf(StagingFinancialEvents);
	expect(result.identifierRelationships).toBeInstanceOf(StagingIdentifierRelationships);
});

function staged(file: ImportFile, graph: ProvenanceGraph): StagingFinancialEvents {
	graph.node(file, ProvenanceNodeKind.FILE, file.fileName, {});
	const segmented = new IbkrExtractService().extractFromXML(file, graph);
	return new IbkrTransformService().convertSegmentedTradesToStagingEvents(segmented, graph);
}

test("two halves of a corporate action pair into one", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const staging = staged(
		TestKit.ibkr.corporateActionsTwoRows.inputs.corporateActionsTwoRows.read(),
		graph,
	);

	const resolved =
		new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(
			staging,
			graph,
		);

	const paired = graph.nodeOf(resolved.identifierRelationships.relationships[0]);
	expect(paired.kind).toEqual(ProvenanceNodeKind.STAGING_CORPORATE_ACTION);
	expect(paired.label).toEqual("SPLIT SMCI.OLD → SMCI");
	const halves = new ProvenanceWalker(graph).parents(paired);
	expect(halves).toHaveLength(2);
	expect(halves[0].change).toEqual(ProvenanceChange.PAIRED);
	expect(halves[0].from.label).toEqual("corporate action 141913764 · from SMCI.OLD");
	expect(halves[1].from.label).toEqual("corporate action 141913764 · to SMCI");
});

test("a half with no partner is dropped as unpaired", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const staging = staged(TestKit.ibkr.corporateAction.inputs.simpleCorporateAction.read(), graph);

	new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(
		staging,
		graph,
	);

	const drops = graph.drops();
	expect(drops).toHaveLength(1);
	expect(drops[0].node.label).toEqual("corporate action 114947593 · to TORO");
	expect(drops[0].reason).toEqual(DropReason.UNPAIRED);
});

test("a third row in a paired corporate action is dropped as unpaired", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const twoRows = TestKit.ibkr.corporateActionsTwoRows.inputs.corporateActionsTwoRows.read();
	// The file's first <CorporateAction …/> is the SMCI half (transactionID 3131760429); repeat it under a new id.
	const start = twoRows.xml.indexOf("<CorporateAction");
	const smciRow = twoRows.xml.slice(start, twoRows.xml.indexOf("/>", start) + 2);
	const extraRow = smciRow.replace('transactionID="3131760429"', 'transactionID="3131760430"');
	const file = {
		fileName: "three-rows.xml",
		xml: twoRows.xml.replace(smciRow, `${smciRow}\n${extraRow}`),
	};
	const staging = staged(file, graph);

	new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(
		staging,
		graph,
	);

	const drops = graph.drops();
	expect(drops).toHaveLength(1);
	expect(drops[0].node.label).toEqual("corporate action 141913764 · to SMCI");
	expect(drops[0].reason).toEqual(DropReason.UNPAIRED);
});
