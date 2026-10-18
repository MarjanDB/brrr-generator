import { Scenario } from "@brrr/__tests__/support/Scenario";
import { CorrelationKey, Isin, Ticker } from "@brrr/Core/Schemas/Identifiers";
import {
	StagingIdentifierChangeType,
	StagingIdentifierRelationship,
	StagingIdentifierRelationshipPartial,
	StagingIdentifierRelationshipPartialWithQuantity,
	StagingIdentifierRelationshipSplit,
	StagingIdentifierRelationships,
} from "@brrr/Core/Schemas/Staging/IdentifierRelationship";
import { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";
import { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";
import { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution";

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
	);
	expect(result.length).toEqual(0);
});

test("empty partials returns empty", () => {
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships([]);
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
		);

	expect(result).toBeInstanceOf(StagingFinancialEvents);
	expect(result.identifierRelationships).toBeInstanceOf(StagingIdentifierRelationships);
});
