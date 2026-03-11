import { DateTime } from "luxon";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats.ts";
import { TradeEventStockAcquired, type TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";
import { TaxLot, type TaxLotStock } from "@brrr/Core/Schemas/Lots.ts";
import type { StagingTaxLot } from "@brrr/Core/Schemas/Staging/Lots.ts";
import { ProcessingUtils } from "@brrr/Core/FinancialEvents/ProcessingUtils.ts";

const utils = new ProcessingUtils();

export function processStockLot(
	input: StagingTaxLot,
	references: (TradeEventStockAcquired | TradeEventStockSold)[],
): TaxLotStock {
	const allBuys = references.filter((t): t is TradeEventStockAcquired => t instanceof TradeEventStockAcquired);
	const allSells = references.filter((t): t is TradeEventStockSold => !(t instanceof TradeEventStockAcquired));

	let matchingBuy: TradeEventStockAcquired;
	let matchingSell: TradeEventStockSold;

	try {
		matchingBuy = utils.findEventById(input.acquired.id ?? "", allBuys);
		const soldDate = input.sold.dateTime ?? DateTime.fromMillis(0) as ValidDateTime;
		const sellMatches = utils.findEventByDate(soldDate, allSells);
		if (sellMatches.length === 0) throw new Error("No sell found");
		matchingSell = sellMatches[0];
	} catch (_e) {
		console.error(`Failed processing stock lot (ID: ${input.id}, FinancialIdentifier: ${input.financialIdentifier}), found no match`);
		throw new Error(`LookupError: Failed to match stock lot (ID: ${input.id})`);
	}

	return new TaxLot({
		id: input.id,
		financialIdentifier: FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier),
		quantity: input.quantity,
		acquired: matchingBuy,
		sold: matchingSell,
		shortLongType: GenericShortLong.LONG,
		provenance: [],
	});
}
