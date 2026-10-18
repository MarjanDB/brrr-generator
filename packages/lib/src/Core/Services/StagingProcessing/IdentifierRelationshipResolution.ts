import type { CorrelationKey } from "@brrr/Core/Models/Identifiers";
import { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import { StagingIdentifierRelationship } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationship";
import type { StagingIdentifierRelationshipAny } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipAny";
import type { StagingIdentifierRelationshipPartialAny } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartialAny";
import { StagingIdentifierRelationshipSplit } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipSplit";
import { StagingIdentifierRelationships } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationships";
import { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import { ProvenanceLabels } from "@brrr/Core/Utils/ProvenanceLabels";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";

const STAGE = ProvenanceStage.Schema.parse("IdentifierRelationshipResolution");

export class IdentifierRelationshipResolution {
	public mergePartialIdentifierRelationships(
		partials: StagingIdentifierRelationshipPartialAny[],
		provenance: IProvenanceRecorder,
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
			if (!fromPartial || !toPartial || !fromPartial.fromIdentifier || !toPartial.toIdentifier) {
				for (const row of rows) {
					provenance.drop(row, DropReason.UNPAIRED, STAGE, null);
				}
				continue;
			}

			const { changeType, effectiveDate } = fromPartial;

			// Both sides carry a quantity when the action is a split.
			let relationship: StagingIdentifierRelationshipAny;
			if (fromPartial.quantity != null && toPartial.quantity != null) {
				const quantityBefore = Math.abs(fromPartial.quantity);
				const quantityAfter = Math.abs(toPartial.quantity);
				relationship = new StagingIdentifierRelationshipSplit({
					fromIdentifier: fromPartial.fromIdentifier,
					toIdentifier: toPartial.toIdentifier,
					changeType:
						quantityAfter < quantityBefore ? StagingIdentifierChangeType.REVERSE_SPLIT : changeType,
					effectiveDate,
					quantityBefore,
					quantityAfter,
				});
			} else {
				relationship = new StagingIdentifierRelationship({
					fromIdentifier: fromPartial.fromIdentifier,
					toIdentifier: toPartial.toIdentifier,
					changeType,
					effectiveDate,
				});
			}
			merged.push(relationship);
			provenance.node(
				relationship,
				ProvenanceNodeKind.STAGING_CORPORATE_ACTION,
				ProvenanceLabels.corporateAction(
					relationship.changeType,
					relationship.fromIdentifier.ticker,
					relationship.toIdentifier.ticker,
					null,
				),
				{},
			);
			provenance.derive(
				[fromPartial, toPartial],
				relationship,
				ProvenanceChange.PAIRED,
				STAGE,
				null,
			);
			for (const row of rows) {
				if (row !== fromPartial && row !== toPartial) {
					provenance.drop(row, DropReason.UNPAIRED, STAGE, null);
				}
			}
		}
		return merged;
	}

	public resolveStagingFinancialEventsPartialRelationships(
		events: StagingFinancialEvents,
		provenance: IProvenanceRecorder,
	): StagingFinancialEvents {
		const merged = this.mergePartialIdentifierRelationships(
			events.identifierRelationships.partialRelationships,
			provenance,
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
