import { DateTime } from "luxon";
import { FinancialIdentifier } from "@brrr/core/schemas/FinancialIdentifier.ts";
import { GenericShortLong } from "@brrr/core/schemas/CommonFormats.ts";
import type { TradeEventDerivativeAcquired, TradeEventDerivativeSold } from "@brrr/core/schemas/Events.ts";
import type { TaxLotDerivative } from "@brrr/core/schemas/Lots.ts";
import type { StagingTaxLot } from "@brrr/core/schemas/staging/Lots.ts";

function findById<T extends { id: string }>(id: string, items: T[]): T {
	const found = items.find((x) => x.id === id);
	if (!found) throw new Error(`No item found with id: ${id}`);
	return found;
}

function findByDate<T extends { date: DateTime }>(date: DateTime, items: T[]): T[] {
	return items.filter((x) => x.date.toMillis() === date.toMillis());
}

export function processDerivativeLot(
	input: StagingTaxLot,
	references: (TradeEventDerivativeAcquired | TradeEventDerivativeSold)[],
): TaxLotDerivative {
	const allBuys = references.filter((t): t is TradeEventDerivativeAcquired => t.kind === "DerivativeAcquired");
	const allSells = references.filter((t): t is TradeEventDerivativeSold => t.kind === "DerivativeSold");

	let matchingBuy: TradeEventDerivativeAcquired;
	let matchingSell: TradeEventDerivativeSold;

	try {
		matchingBuy = findById(input.acquired.id ?? "", allBuys);
		const soldDate = input.sold.dateTime ?? DateTime.fromMillis(0);
		const sellMatches = findByDate(soldDate, allSells);
		if (sellMatches.length === 0) throw new Error("No sell found");
		matchingSell = sellMatches[0];
	} catch (_e) {
		console.error(`Failed processing derivative lot (ID: ${input.id}), found no match`);
		throw new Error(`LookupError: Failed to match derivative lot (ID: ${input.id})`);
	}

	return {
		id: input.id,
		financialIdentifier: FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier),
		quantity: input.quantity,
		acquired: matchingBuy,
		sold: matchingSell,
		shortLongType: GenericShortLong.LONG,
		provenance: [],
	};
}
