import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import type { TradeEventDerivative } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivative";
import type { TradeEventStock } from "@brrr/Core/Models/Events/Stock/TradeEventStock";
import type { DerivativeGrouping } from "@brrr/Core/Models/Groupings/DerivativeGrouping";
import type { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import type { LotLeg } from "@brrr/Core/Models/LotMatching/LotLeg";
import type { MatchedLot } from "@brrr/Core/Models/LotMatching/MatchedLot";
import type { LotMatcher } from "@brrr/Core/Services/LotMatching/LotMatcher";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

const STAGE = ProvenanceStage.Schema.parse("FinancialEventsProcessor");

// Matches an instrument's trades into lots and keeps the legs of the lots closed in a period:
// those are the trades a capital gains report lists, each with the lot's share of it.
export class FinancialEventsProcessor {
	public constructor(private readonly lotMatcher: LotMatcher) {}

	public stockLotLegsClosedInPeriod(
		grouping: FinancialGrouping,
		method: ILotMatchingMethod,
		fromDate: ValidDateTime,
		toDate: ValidDateTime,
		provenance: IProvenanceRecorder,
	): LotLeg<TradeEventStock>[] {
		return legsOfLotsClosedInPeriod(
			grouping.stockTrades,
			this.lotMatcher.matchLots(method, grouping.stockTrades, provenance),
			fromDate,
			toDate,
			provenance,
		);
	}

	public derivativeLotLegsClosedInPeriod(
		grouping: DerivativeGrouping,
		method: ILotMatchingMethod,
		fromDate: ValidDateTime,
		toDate: ValidDateTime,
		provenance: IProvenanceRecorder,
	): LotLeg<TradeEventDerivative>[] {
		return legsOfLotsClosedInPeriod(
			grouping.derivativeTrades,
			this.lotMatcher.matchLots(method, grouping.derivativeTrades, provenance),
			fromDate,
			toDate,
			provenance,
		);
	}
}

function legsOfLotsClosedInPeriod<T extends { date: ValidDateTime }>(
	trades: T[],
	lots: MatchedLot<T>[],
	periodStart: ValidDateTime,
	periodEnd: ValidDateTime,
	provenance: IProvenanceRecorder,
): LotLeg<T>[] {
	const closedInPeriod: MatchedLot<T>[] = [];
	for (const lot of lots) {
		if (lot.sold.trade.date >= periodStart && lot.sold.trade.date <= periodEnd) {
			closedInPeriod.push(lot);
		} else {
			const closed = lot.sold.trade.date.toFormat("yyyy-MM-dd");
			provenance.drop(lot.acquired, DropReason.OUTSIDE_PERIOD, STAGE, `closed ${closed}`);
			provenance.drop(lot.sold, DropReason.OUTSIDE_PERIOD, STAGE, `closed ${closed}`);
		}
	}

	const tradesInLots = new Set(lots.flatMap((lot) => [lot.acquired.trade, lot.sold.trade]));
	for (const trade of trades) {
		if (!tradesInLots.has(trade)) {
			provenance.drop(trade, DropReason.POSITION_OPEN, STAGE, null);
		}
	}

	const legs = [
		...closedInPeriod.map((lot) => lot.acquired),
		...closedInPeriod.map((lot) => lot.sold),
	];
	return legs.sort((a, b) => a.trade.date.toMillis() - b.trade.date.toMillis());
}
