import { DateTime } from "luxon";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats.ts";
import { TradeEventStockAcquired, type TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";
import type { TaxLotStock } from "@brrr/Core/Schemas/Lots.ts";
import type { StagingTaxLot } from "@brrr/Core/Schemas/Staging/Lots.ts";

function findById<T extends { id: string }>(id: string, items: T[]): T {
	const found = items.find((x) => x.id === id);
	if (!found) throw new Error(`No item found with id: ${id}`);
	return found;
}

function findByDate<T extends { date: DateTime }>(date: DateTime, items: T[]): T[] {
	return items.filter((x) => x.date.toMillis() === date.toMillis());
}

export function processStockLot(
	input: StagingTaxLot,
	references: (TradeEventStockAcquired | TradeEventStockSold)[],
): TaxLotStock {
	const allBuys = references.filter((t): t is TradeEventStockAcquired => t instanceof TradeEventStockAcquired);
	const allSells = references.filter((t): t is TradeEventStockSold => !(t instanceof TradeEventStockAcquired));

	let matchingBuy: TradeEventStockAcquired;
	let matchingSell: TradeEventStockSold;

	try {
		matchingBuy = findById(input.acquired.id ?? "", allBuys);
		const soldDate = input.sold.dateTime ?? DateTime.fromMillis(0);
		const sellMatches = findByDate(soldDate, allSells);
		if (sellMatches.length === 0) throw new Error("No sell found");
		matchingSell = sellMatches[0];
	} catch (_e) {
		console.error(`Failed processing stock lot (ID: ${input.id}, FinancialIdentifier: ${input.financialIdentifier}), found no match`);
		throw new Error(`LookupError: Failed to match stock lot (ID: ${input.id})`);
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
