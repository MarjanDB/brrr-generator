import {
	StagingIdentifierChangeType,
	StagingIdentifierRelationship,
	StagingIdentifierRelationshipPartial,
	StagingIdentifierRelationshipPartialWithQuantity,
	StagingIdentifierRelationships,
	type StagingIdentifierRelationshipSplit,
} from "@brrr/Core/Schemas/Staging/IdentifierRelationship.ts";
import { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents.ts";
import { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier.ts";
import { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution.ts";
import { DateTime } from "luxon";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";

function makeDate(iso: string): ValidDateTime {
	return DateTime.fromISO(iso) as ValidDateTime;
}

test("two partials same key produce one full relationship", () => {
	const fromId = new StagingFinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old Inc" });
	const toId = new StagingFinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New Inc" });
	const partials: StagingIdentifierRelationshipPartial[] = [
		new StagingIdentifierRelationshipPartial({
			fromIdentifier: fromId,
			toIdentifier: null,
			correlationKey: "action-1",
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: makeDate("2024-10-01"),
		}),
		new StagingIdentifierRelationshipPartial({
			fromIdentifier: null,
			toIdentifier: toId,
			correlationKey: "action-1",
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: makeDate("2024-10-01"),
		}),
	];
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(partials);
	expect(result.length).toEqual(1);
	expect(result[0].fromIdentifier.getIsin()).toEqual("US111");
	expect(result[0].toIdentifier.getIsin()).toEqual("US222");
	expect(result[0].changeType).toEqual(StagingIdentifierChangeType.SPLIT);
	expect(result[0].effectiveDate !== null).toEqual(true);
});

test("partials with quantity produce full with quantityBefore/quantityAfter", () => {
	const fromId = new StagingFinancialIdentifier({ isin: "US86800U1043", ticker: "SMCI.OLD", name: "Old" });
	const toId = new StagingFinancialIdentifier({ isin: "US86800U3023", ticker: "SMCI", name: "New" });
	const partials: StagingIdentifierRelationshipPartialWithQuantity[] = [
		new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: fromId,
			toIdentifier: null,
			correlationKey: "action-1",
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: makeDate("2024-09-30"),
			quantity: 4.0,
		}),
		new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: null,
			toIdentifier: toId,
			correlationKey: "action-1",
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: makeDate("2024-09-30"),
			quantity: 40.0,
		}),
	];
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(partials);
	expect(result.length).toEqual(1);
	const r = result[0] as StagingIdentifierRelationshipSplit;
	expect(r.quantityBefore).toEqual(4.0);
	expect(r.quantityAfter).toEqual(40.0);
	expect(r.changeType).toEqual(StagingIdentifierChangeType.SPLIT);
});

test("reverse split inferred when quantity after less than before", () => {
	const fromId = new StagingFinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const toId = new StagingFinancialIdentifier({ isin: "US222", ticker: "NEW", name: "New" });
	const partials: StagingIdentifierRelationshipPartialWithQuantity[] = [
		new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: fromId,
			toIdentifier: null,
			correlationKey: "rev-1",
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: makeDate("2024-10-01"),
			quantity: 10.0,
		}),
		new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: null,
			toIdentifier: toId,
			correlationKey: "rev-1",
			changeType: StagingIdentifierChangeType.SPLIT,
			effectiveDate: makeDate("2024-10-01"),
			quantity: 1.0,
		}),
	];
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(partials);
	expect(result.length).toEqual(1);
	const r = result[0] as StagingIdentifierRelationshipSplit;
	expect(r.changeType).toEqual(StagingIdentifierChangeType.REVERSE_SPLIT);
	expect(r.quantityBefore).toEqual(10.0);
	expect(r.quantityAfter).toEqual(1.0);
});

test("only from partial produces no full relationship", () => {
	const fromId = new StagingFinancialIdentifier({ isin: "US111", ticker: "OLD", name: "Old" });
	const partials: StagingIdentifierRelationshipPartial[] = [
		new StagingIdentifierRelationshipPartial({
			fromIdentifier: fromId,
			toIdentifier: null,
			correlationKey: "action-1",
			changeType: StagingIdentifierChangeType.RENAME,
			effectiveDate: makeDate("2024-01-01"),
		}),
	];
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships(partials);
	expect(result.length).toEqual(0);
});

test("empty partials returns empty", () => {
	const result = new IdentifierRelationshipResolution().mergePartialIdentifierRelationships([]);
	expect(result.length).toEqual(0);
});

test("preserves existing full relationships", () => {
	const fromId = new StagingFinancialIdentifier({ isin: "US111", ticker: "A", name: "A" });
	const toId = new StagingFinancialIdentifier({ isin: "US222", ticker: "B", name: "B" });
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
	const result = new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(events);
	expect(result.identifierRelationships.relationships.length).toEqual(1);
	expect(result.identifierRelationships.relationships[0].fromIdentifier.getIsin()).toEqual("US111");
	expect(result.identifierRelationships.partialRelationships.length).toEqual(0);
});
