import {
	StagingIdentifierChangeType,
	StagingIdentifierRelationship,
	StagingIdentifierRelationshipSplit,
	type StagingIdentifierRelationshipAny,
	type StagingIdentifierRelationshipPartialAny,
} from "@brrr/Core/Schemas/Staging/IdentifierRelationship.ts";
import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents.ts";

export class IdentifierRelationshipResolution {
	mergePartialIdentifierRelationships(
		partials: StagingIdentifierRelationshipPartialAny[],
	): StagingIdentifierRelationshipAny[] {
		if (partials.length === 0) return [];

		// Group by correlationKey
		const grouped = new Map<string, StagingIdentifierRelationshipPartialAny[]>();
		for (const p of partials) {
			const arr = grouped.get(p.correlationKey) ?? [];
			arr.push(p);
			grouped.set(p.correlationKey, arr);
		}

		const merged: StagingIdentifierRelationshipAny[] = [];
		for (const [, rows] of grouped) {
			const fromPartial = rows.find((r) => r.fromIdentifier !== null && r.toIdentifier === null) ?? null;
			const toPartial = rows.find((r) => r.toIdentifier !== null && r.fromIdentifier === null) ?? null;
			if (!fromPartial || !toPartial || !fromPartial.fromIdentifier || !toPartial.toIdentifier) continue;

			const changeType = fromPartial.changeType ?? toPartial.changeType ?? StagingIdentifierChangeType.RENAME;
			const effectiveDate = fromPartial.effectiveDate ?? toPartial.effectiveDate ?? null;

			// Check if both are PartialWithQuantity (has required quantity field)
			const fromQty = fromPartial.quantity != null ? fromPartial.quantity : undefined;
			const toQty = toPartial.quantity != null ? toPartial.quantity : undefined;

			if (fromQty !== undefined && toQty !== undefined) {
				const quantityBefore = Math.abs(fromQty);
				const quantityAfter = Math.abs(toQty);
				let finalChangeType = changeType;
				if (quantityAfter < quantityBefore) {
					finalChangeType = StagingIdentifierChangeType.REVERSE_SPLIT;
				}
				merged.push(new StagingIdentifierRelationshipSplit({
					fromIdentifier: fromPartial.fromIdentifier,
					toIdentifier: toPartial.toIdentifier,
					changeType: finalChangeType,
					effectiveDate,
					quantityBefore,
					quantityAfter,
				}));
			} else {
				merged.push(new StagingIdentifierRelationship({
					fromIdentifier: fromPartial.fromIdentifier,
					toIdentifier: toPartial.toIdentifier,
					changeType,
					effectiveDate,
				}));
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
		const allRelationships = [
			...events.identifierRelationships.relationships,
			...merged,
		];
		return {
			groupings: events.groupings,
			identifierRelationships: {
				relationships: allRelationships,
				partialRelationships: events.identifierRelationships.partialRelationships,
			},
		};
	}
}
