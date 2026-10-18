import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { DerivativeGrouping } from "@brrr/Core/Schemas/Groupings/DerivativeGrouping";
import { FinancialGrouping } from "@brrr/Core/Schemas/Groupings/FinancialGrouping";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierChangeType";
import { IdentifierRelationship } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierRelationship";
import type { IdentifierRelationshipAny } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierRelationshipAny";
import { IdentifierRelationshipSplit } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierRelationshipSplit";
import type { FinancialIdentifierKey } from "@brrr/Core/Schemas/Identifiers";
import { FinancialIdentifier } from "@brrr/Core/Schemas/Instrument/FinancialIdentifier";
import type { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Groupings/StagingFinancialGrouping";
import { StagingIdentifierChangeType } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import { StagingIdentifierRelationshipSplit } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipSplit";
import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";
import type { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution";
import {
	toCoreCashTransaction,
	toCoreDerivativeLot,
	toCoreDerivativeTrade,
	toCoreStockLot,
	toCoreStockTrade,
} from "@brrr/Core/StagingProcessor/StagingToCore";
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
	constructor(private readonly relationshipResolution: IdentifierRelationshipResolution) {}

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

	process(input: StagingFinancialGrouping): FinancialGrouping {
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

	generateGenericGroupings(groupings: StagingFinancialGrouping[]): FinancialGrouping[] {
		return groupings.map((g) => this.process(g));
	}

	processStagingFinancialEvents(events: StagingFinancialEvents): FinancialEvents {
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
