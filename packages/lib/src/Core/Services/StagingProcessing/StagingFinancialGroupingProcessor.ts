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

// Used when a broker gives a relationship no effective date.
const UNKNOWN_EFFECTIVE_DATE = DateTime.fromMillis(0) as ValidDateTime;

export class StagingFinancialGroupingProcessor {
	public constructor(private readonly relationshipResolution: IdentifierRelationshipResolution) {}

	private processAndGroupDerivativeTrades(input: StagingFinancialGrouping): DerivativeGrouping[] {
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
			const trades = stagingTrades.map(toCoreDerivativeTrade);
			const lots = lotsByIdKey.get(key) ?? [];
			derivativeGroupings.push(
				new DerivativeGrouping({
					financialIdentifier: FinancialIdentifier.fromStagingIdentifier(
						stagingTrades[0].financialIdentifier,
					),
					derivativeTrades: trades,
					derivativeTaxLots: lots.map((lot) => toCoreDerivativeLot(lot, trades)),
					provenance: [],
				}),
			);
		}
		return derivativeGroupings;
	}

	public process(input: StagingFinancialGrouping): FinancialGrouping {
		const stockTrades = input.stockTrades.map(toCoreStockTrade);

		return new FinancialGrouping({
			financialIdentifier: FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier),
			countryOfOrigin: input.countryOfOrigin,
			underlyingCategory: input.underlyingCategory,
			stockTrades,
			stockTaxLots: input.stockTaxLots.map((lot) => toCoreStockLot(lot, stockTrades)),
			derivativeGroupings: this.processAndGroupDerivativeTrades(input),
			cashTransactions: input.cashTransactions.map(toCoreCashTransaction),
			provenance: [],
		});
	}

	public generateGenericGroupings(groupings: StagingFinancialGrouping[]): FinancialGrouping[] {
		return groupings.map((g) => this.process(g));
	}

	public processStagingFinancialEvents(events: StagingFinancialEvents): FinancialEvents {
		const resolved =
			this.relationshipResolution.resolveStagingFinancialEventsPartialRelationships(events);
		const processedGroupings = this.generateGenericGroupings(resolved.groupings);

		const coreRels: IdentifierRelationshipAny[] = [];
		for (const r of resolved.identifierRelationships.relationships) {
			if (r.changeType === StagingIdentifierChangeType.UNKNOWN) continue;
			const fields = {
				fromIdentifier: FinancialIdentifier.fromStagingIdentifier(r.fromIdentifier),
				toIdentifier: FinancialIdentifier.fromStagingIdentifier(r.toIdentifier),
				changeType: CHANGE_TYPES[r.changeType],
				effectiveDate: r.effectiveDate ?? UNKNOWN_EFFECTIVE_DATE,
			};

			if (r instanceof StagingIdentifierRelationshipSplit) {
				coreRels.push(
					new IdentifierRelationshipSplit({
						...fields,
						quantityBefore: r.quantityBefore,
						quantityAfter: r.quantityAfter,
					}),
				);
			} else {
				coreRels.push(new IdentifierRelationship(fields));
			}
		}

		return new FinancialEvents({
			groupings: processedGroupings,
			identifierRelationships: coreRels,
		});
	}
}
