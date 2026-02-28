import { DateTime } from "luxon";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats.ts";
import { TradeEventDerivativeAcquired, type TradeEventDerivativeSold } from "@brrr/Core/Schemas/Events.ts";
import { TaxLot, type TaxLotDerivative } from "@brrr/Core/Schemas/Lots.ts";
import type { StagingTaxLot } from "@brrr/Core/Schemas/Staging/Lots.ts";
import { ProcessingUtils } from "@brrr/Core/FinancialEvents/ProcessingUtils.ts";

const utils = new ProcessingUtils();

export function processDerivativeLot(
	input: StagingTaxLot,
	references: (TradeEventDerivativeAcquired | TradeEventDerivativeSold)[],
): TaxLotDerivative {
	const allBuys = references.filter((t): t is TradeEventDerivativeAcquired => t instanceof TradeEventDerivativeAcquired);
	const allSells = references.filter((t): t is TradeEventDerivativeSold => !(t instanceof TradeEventDerivativeAcquired));

	let matchingBuy: TradeEventDerivativeAcquired;
	let matchingSell: TradeEventDerivativeSold;

	try {
		matchingBuy = utils.findEventById(input.acquired.id ?? "", allBuys);
		const soldDate = input.sold.dateTime ?? DateTime.fromMillis(0) as ValidDateTime;
		const sellMatches = utils.findEventByDate(soldDate, allSells);
		if (sellMatches.length === 0) throw new Error("No sell found");
		matchingSell = sellMatches[0];
	} catch (_e) {
		console.error(`Failed processing derivative lot (ID: ${input.id}), found no match`);
		throw new Error(`LookupError: Failed to match derivative lot (ID: ${input.id})`);
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
