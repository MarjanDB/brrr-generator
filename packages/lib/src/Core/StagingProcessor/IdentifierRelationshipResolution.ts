import type { CorrelationKey } from "@brrr/Core/Schemas/Identifiers";
import { StagingIdentifierChangeType } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import { StagingIdentifierRelationship } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationship";
import type { StagingIdentifierRelationshipAny } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipAny";
import type { StagingIdentifierRelationshipPartialAny } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartialAny";
import { StagingIdentifierRelationshipSplit } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipSplit";
import { StagingIdentifierRelationships } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationships";
import { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";

export class IdentifierRelationshipResolution {
	mergePartialIdentifierRelationships(
		partials: StagingIdentifierRelationshipPartialAny[],
	): StagingIdentifierRelationshipAny[] {
		if (partials.length === 0) return [];

		// Group by correlationKey
		const grouped = new Map<CorrelationKey, StagingIdentifierRelationshipPartialAny[]>();
		for (const p of partials) {
			const arr = grouped.get(p.correlationKey) ?? [];
			arr.push(p);
			grouped.set(p.correlationKey, arr);
		}

		const merged: StagingIdentifierRelationshipAny[] = [];
		for (const [, rows] of grouped) {
			const fromPartial =
				rows.find((r) => r.fromIdentifier !== null && r.toIdentifier === null) ?? null;
			const toPartial =
				rows.find((r) => r.toIdentifier !== null && r.fromIdentifier === null) ?? null;
			if (!fromPartial || !toPartial || !fromPartial.fromIdentifier || !toPartial.toIdentifier)
				continue;

			const { changeType, effectiveDate } = fromPartial;

			// Both sides carry a quantity when the action is a split.
			if (fromPartial.quantity != null && toPartial.quantity != null) {
				const quantityBefore = Math.abs(fromPartial.quantity);
				const quantityAfter = Math.abs(toPartial.quantity);
				merged.push(
					new StagingIdentifierRelationshipSplit({
						fromIdentifier: fromPartial.fromIdentifier,
						toIdentifier: toPartial.toIdentifier,
						changeType:
							quantityAfter < quantityBefore
								? StagingIdentifierChangeType.REVERSE_SPLIT
								: changeType,
						effectiveDate,
						quantityBefore,
						quantityAfter,
					}),
				);
			} else {
				merged.push(
					new StagingIdentifierRelationship({
						fromIdentifier: fromPartial.fromIdentifier,
						toIdentifier: toPartial.toIdentifier,
						changeType,
						effectiveDate,
					}),
				);
			}
		}
		return merged;
	}

	resolveStagingFinancialEventsPartialRelationships(
		events: StagingFinancialEvents,
	): StagingFinancialEvents {
		const merged = this.mergePartialIdentifierRelationships(
			events.identifierRelationships.partialRelationships,
		);
		const allRelationships = [...events.identifierRelationships.relationships, ...merged];
		return new StagingFinancialEvents({
			groupings: events.groupings,
			identifierRelationships: new StagingIdentifierRelationships({
				relationships: allRelationships,
				partialRelationships: events.identifierRelationships.partialRelationships,
			}),
		});
	}
}
