import { ProcessingUtils } from "@brrr/Core/FinancialEvents/ProcessingUtils";
import { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired, type TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { TaxLot, type TaxLotStock } from "@brrr/Core/Schemas/Lots";
import type { StagingTaxLot } from "@brrr/Core/Schemas/Staging/Lots";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

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
