import type {
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
} from "@brrr/Core/Schemas/Events";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import {
	IdentifierChangeType,
	IdentifierRelationship,
	IdentifierRelationshipSplit,
} from "@brrr/Core/Schemas/IdentifierRelationship";
import type { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping";
import type { StagingIdentifierRelationshipSplit } from "@brrr/Core/Schemas/Staging/IdentifierRelationship";
import { StagingIdentifierChangeType } from "@brrr/Core/Schemas/Staging/IdentifierRelationship";
import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";
import { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution";
import { processCashTransaction } from "@brrr/Core/StagingProcessor/Transformers/CashTransactionEventProcessor";
import { processDerivativeEvent } from "@brrr/Core/StagingProcessor/Transformers/DerivativeEventProcessor";
import { processDerivativeLot } from "@brrr/Core/StagingProcessor/Transformers/DerivativeLotProcessor";
import { processStockEvent } from "@brrr/Core/StagingProcessor/Transformers/StockEventProcessor";
import { processStockLot } from "@brrr/Core/StagingProcessor/Transformers/StockLotProcessor";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

export class StagingFinancialGroupingProcessor {
	private identifierRelationshipResolution = new IdentifierRelationshipResolution();

	private processAndGroupDerivativeTrades(input: StagingFinancialGrouping): DerivativeGrouping[] {
		const processedDerivatives = input.derivativeTrades.map(processDerivativeEvent);
		const allDerivativeTrades = processedDerivatives;

		// Group by financialIdentifier key
		const tradesByIdKey = new Map<
			string,
			(TradeEventDerivativeAcquired | TradeEventDerivativeSold)[]
		>();
		for (const trade of allDerivativeTrades) {
			const key = trade.financialIdentifier.toKey();
			const arr = tradesByIdKey.get(key) ?? [];
			arr.push(trade);
			tradesByIdKey.set(key, arr);
		}

		const lotsByIdKey = new Map<string, typeof input.derivativeTaxLots>();
		for (const lot of input.derivativeTaxLots) {
			const key = FinancialIdentifier.fromStagingIdentifier(lot.financialIdentifier).toKey();
			const arr = lotsByIdKey.get(key) ?? [];
			arr.push(lot);
			lotsByIdKey.set(key, arr);
		}

		const derivativeGroupings: DerivativeGrouping[] = [];
		for (const [key, trades] of tradesByIdKey) {
			const lots = lotsByIdKey.get(key) ?? [];
			const processedLots = lots.map((lot) => processDerivativeLot(lot, trades));
			derivativeGroupings.push(
				new DerivativeGrouping({
					financialIdentifier: trades[0].financialIdentifier,
					derivativeTrades: trades,
					derivativeTaxLots: processedLots,
					provenance: [],
				}),
			);
		}
		return derivativeGroupings;
	}

	process(input: StagingFinancialGrouping): FinancialGrouping {
		const processedTrades = input.stockTrades.map(processStockEvent);
		const allTrades = processedTrades;

		const processedStockLots = input.stockTaxLots.map((lot) => processStockLot(lot, allTrades));

		const derivativeGroupings = this.processAndGroupDerivativeTrades(input);

		const processedCashTransactions = input.cashTransactions.map(processCashTransaction);

		return new FinancialGrouping({
			financialIdentifier: FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier),
			countryOfOrigin: input.countryOfOrigin,
			underlyingCategory: input.underlyingCategory,
			stockTrades: allTrades,
			stockTaxLots: processedStockLots,
			derivativeGroupings,
			cashTransactions: processedCashTransactions,
			provenance: [],
		});
	}

	generateGenericGroupings(groupings: StagingFinancialGrouping[]): FinancialGrouping[] {
		return groupings.map((g) => this.process(g));
	}

	processStagingFinancialEvents(events: StagingFinancialEvents): FinancialEvents {
		const resolved =
			this.identifierRelationshipResolution.resolveStagingFinancialEventsPartialRelationships(
				events,
			);
		const processedGroupings = this.generateGenericGroupings(resolved.groupings);

		const coreRels: FinancialEvents["identifierRelationships"] = [];
		for (const r of resolved.identifierRelationships.relationships) {
			if (r.changeType === StagingIdentifierChangeType.UNKNOWN) continue;
			const effectiveDate = r.effectiveDate ?? (DateTime.fromMillis(0) as ValidDateTime);
			const fromId = FinancialIdentifier.fromStagingIdentifier(r.fromIdentifier);
			const toId = FinancialIdentifier.fromStagingIdentifier(r.toIdentifier);
			const changeType = IdentifierChangeType[r.changeType as keyof typeof IdentifierChangeType];

			// Check if it's a split relationship (has quantityBefore/quantityAfter)
			const rSplit = r as StagingIdentifierRelationshipSplit;
			if (rSplit.quantityBefore !== undefined && rSplit.quantityAfter !== undefined) {
				coreRels.push(
					new IdentifierRelationshipSplit({
						fromIdentifier: fromId,
						toIdentifier: toId,
						changeType,
						effectiveDate,
						quantityBefore: rSplit.quantityBefore,
						quantityAfter: rSplit.quantityAfter,
					}),
				);
			} else {
				coreRels.push(
					new IdentifierRelationship({
						fromIdentifier: fromId,
						toIdentifier: toId,
						changeType,
						effectiveDate,
					}),
				);
			}
		}

		return new FinancialEvents({
			groupings: processedGroupings,
			identifierRelationships: coreRels,
		});
	}
}
