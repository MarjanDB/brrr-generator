import { FinancialEvents } from "@brrr/Core/Models/FinancialEvents";
import { DerivativeGrouping } from "@brrr/Core/Models/Groupings/DerivativeGrouping";
import { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import { IdentifierChangeType } from "@brrr/Core/Models/IdentifierRelationships/IdentifierChangeType";
import { IdentifierRelationship } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationship";
import type { IdentifierRelationshipAny } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationshipAny";
import { IdentifierRelationshipSplit } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationshipSplit";
import type { FinancialIdentifierKey } from "@brrr/Core/Models/Identifiers";
import { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import type { StagingFinancialGrouping } from "@brrr/Core/Models/Staging/Groupings/StagingFinancialGrouping";
import { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import { StagingIdentifierRelationshipSplit } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipSplit";
import type { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import type { IdentifierRelationshipResolution } from "@brrr/Core/Services/StagingProcessing/IdentifierRelationshipResolution";
import {
	toCoreCashTransaction,
	toCoreDerivativeLot,
	toCoreDerivativeTrade,
	toCoreStockLot,
	toCoreStockTrade,
} from "@brrr/Core/Services/StagingProcessing/StagingToCore";
import {
	recordDerivativeGroupingMembers,
	recordGroupingMembers,
} from "@brrr/Core/Utils/GroupingMembers";
import { ProvenanceLabels } from "@brrr/Core/Utils/ProvenanceLabels";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

const CHANGE_TYPES: Record<
	Exclude<StagingIdentifierChangeType, StagingIdentifierChangeType.UNKNOWN>,
	IdentifierChangeType
> = {
	[StagingIdentifierChangeType.RENAME]: IdentifierChangeType.RENAME,
	[StagingIdentifierChangeType.SPLIT]: IdentifierChangeType.SPLIT,
	[StagingIdentifierChangeType.REVERSE_SPLIT]: IdentifierChangeType.REVERSE_SPLIT,
};

const STAGE = ProvenanceStage.Schema.parse("StagingFinancialGroupingProcessor");

// Used when a broker gives a relationship no effective date.
const UNKNOWN_EFFECTIVE_DATE = DateTime.fromMillis(0) as ValidDateTime;

export class StagingFinancialGroupingProcessor {
	public constructor(private readonly relationshipResolution: IdentifierRelationshipResolution) {}

	private processAndGroupDerivativeTrades(
		input: StagingFinancialGrouping,
		provenance: IProvenanceRecorder,
	): DerivativeGrouping[] {
		const tradesByIdKey = new Map<FinancialIdentifierKey, typeof input.derivativeTrades>();
		for (const trade of input.derivativeTrades) {
			const key = trade.financialIdentifier.toKey();
			const arr = tradesByIdKey.get(key) ?? [];
			arr.push(trade);
			tradesByIdKey.set(key, arr);
		}

		const lotsByIdKey = new Map<FinancialIdentifierKey, typeof input.derivativeTaxLots>();
		for (const lot of input.derivativeTaxLots) {
			const key = lot.financialIdentifier.toKey();
			const arr = lotsByIdKey.get(key) ?? [];
			arr.push(lot);
			lotsByIdKey.set(key, arr);
		}

		const derivativeGroupings: DerivativeGrouping[] = [];
		for (const [key, stagingTrades] of tradesByIdKey) {
			const trades = stagingTrades.map((trade) => toCoreDerivativeTrade(trade, provenance));
			const lots = lotsByIdKey.get(key) ?? [];
			const grouping = new DerivativeGrouping({
				financialIdentifier: FinancialIdentifier.fromStagingIdentifier(
					stagingTrades[0].financialIdentifier,
				),
				derivativeTrades: trades,
				derivativeTaxLots: lots.map((lot) => toCoreDerivativeLot(lot, trades, provenance)),
			});
			provenance.node(
				grouping,
				ProvenanceNodeKind.GROUPING,
				ProvenanceLabels.grouping(
					true,
					grouping.financialIdentifier.isin,
					grouping.financialIdentifier.ticker,
				),
				{},
			);
			provenance.derive([input], grouping, ProvenanceChange.CONVERTED, STAGE, null);
			recordDerivativeGroupingMembers(provenance, grouping, STAGE);
			derivativeGroupings.push(grouping);
		}
		for (const [key, lots] of lotsByIdKey) {
			if (!tradesByIdKey.has(key)) {
				for (const lot of lots) {
					provenance.drop(lot, DropReason.NO_TRADES, STAGE, null);
				}
			}
		}
		return derivativeGroupings;
	}

	public process(
		input: StagingFinancialGrouping,
		provenance: IProvenanceRecorder,
	): FinancialGrouping {
		const stockTrades = input.stockTrades.map((trade) => toCoreStockTrade(trade, provenance));

		const grouping = new FinancialGrouping({
			financialIdentifier: FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier),
			countryOfOrigin: input.countryOfOrigin,
			underlyingCategory: input.underlyingCategory,
			stockTrades,
			stockTaxLots: input.stockTaxLots.map((lot) => toCoreStockLot(lot, stockTrades, provenance)),
			derivativeGroupings: this.processAndGroupDerivativeTrades(input, provenance),
			cashTransactions: input.cashTransactions.map((transaction) =>
				toCoreCashTransaction(transaction, provenance),
			),
		});
		provenance.node(
			grouping,
			ProvenanceNodeKind.GROUPING,
			ProvenanceLabels.grouping(
				false,
				grouping.financialIdentifier.isin,
				grouping.financialIdentifier.ticker,
			),
			{},
		);
		provenance.derive([input], grouping, ProvenanceChange.CONVERTED, STAGE, null);
		recordGroupingMembers(provenance, grouping, STAGE);
		return grouping;
	}

	public generateGenericGroupings(
		groupings: StagingFinancialGrouping[],
		provenance: IProvenanceRecorder,
	): FinancialGrouping[] {
		return groupings.map((g) => this.process(g, provenance));
	}

	public processStagingFinancialEvents(
		events: StagingFinancialEvents,
		provenance: IProvenanceRecorder,
	): FinancialEvents {
		const resolved = this.relationshipResolution.resolveStagingFinancialEventsPartialRelationships(
			events,
			provenance,
		);
		const processedGroupings = this.generateGenericGroupings(resolved.groupings, provenance);

		const coreRels: IdentifierRelationshipAny[] = [];
		for (const r of resolved.identifierRelationships.relationships) {
			if (r.changeType === StagingIdentifierChangeType.UNKNOWN) {
				provenance.drop(r, DropReason.UNKNOWN_TYPE, STAGE, null);
				continue;
			}
			const fields = {
				fromIdentifier: FinancialIdentifier.fromStagingIdentifier(r.fromIdentifier),
				toIdentifier: FinancialIdentifier.fromStagingIdentifier(r.toIdentifier),
				changeType: CHANGE_TYPES[r.changeType],
				effectiveDate: r.effectiveDate ?? UNKNOWN_EFFECTIVE_DATE,
			};

			const split =
				r instanceof StagingIdentifierRelationshipSplit
					? { before: r.quantityBefore, after: r.quantityAfter }
					: null;
			const coreRelationship =
				r instanceof StagingIdentifierRelationshipSplit
					? new IdentifierRelationshipSplit({
							...fields,
							quantityBefore: r.quantityBefore,
							quantityAfter: r.quantityAfter,
						})
					: new IdentifierRelationship(fields);
			coreRels.push(coreRelationship);
			provenance.node(
				coreRelationship,
				ProvenanceNodeKind.CORPORATE_ACTION,
				ProvenanceLabels.corporateAction(
					fields.changeType,
					fields.fromIdentifier.ticker,
					fields.toIdentifier.ticker,
					split,
				),
				{},
			);
			provenance.derive([r], coreRelationship, ProvenanceChange.CONVERTED, STAGE, null);
		}

		return new FinancialEvents({
			groupings: processedGroupings,
			identifierRelationships: coreRels,
		});
	}
}
