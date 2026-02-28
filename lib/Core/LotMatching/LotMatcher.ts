import type { DateTime } from "luxon";
import { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats.ts";
import type { TradeEvent } from "@brrr/Core/Schemas/Events.ts";
import type { TaxLot } from "@brrr/Core/Schemas/Lots.ts";
import type { Lot } from "./Lot.ts";
import type { LotMatchingMethod } from "./LotMatchingMethod.ts";
import type { Trade } from "./Trade.ts";

export type LotMatchingDetails = {
	lots: Lot[];
	trades: Trade[];
};

type GeneratedLotWithTradeEvents = {
	lot: Lot;
	acquiredTrade: TradeEvent;
	soldTrade: TradeEvent;
};

export class GenericLotMatchingDetails {
	lots: TaxLot<TradeEvent, TradeEvent>[];
	trades: TradeEvent[];

	constructor(lots: TaxLot<TradeEvent, TradeEvent>[], trades: TradeEvent[]) {
		this.lots = lots;
		this.trades = trades;
	}

	getTradesOfLotsClosedInPeriod(periodStart: DateTime, periodEnd: DateTime): GenericLotMatchingDetails {
		const lotsClosedInPeriod = this.lots.filter(
			(lot) => lot.sold.date >= periodStart && lot.sold.date <= periodEnd,
		);

		const lotAcquiredTrades = lotsClosedInPeriod.map((lot) => lot.acquired);
		const lotSoldTrades = lotsClosedInPeriod.map((lot) => lot.sold);
		const allTrades = [...lotAcquiredTrades, ...lotSoldTrades];

		const sortedTrades = [...allTrades].sort((a, b) => a.date.toMillis() - b.date.toMillis());

		return new GenericLotMatchingDetails(lotsClosedInPeriod, sortedTrades);
	}
}

export class LotMatcher {
	matchLotsWithTrades(method: LotMatchingMethod, events: Trade[]): LotMatchingDetails {
		const lots = method.performMatching(events);
		const trades = method.generateTradesFromLotsWithTracking(lots);
		return { lots, trades };
	}

	matchLotsWithGenericTradeEvents(method: LotMatchingMethod, events: TradeEvent[]): GenericLotMatchingDetails {
		const tradeEventMappings = new Map<string, TradeEvent>();
		const tradeMappings = new Map<string, Trade>();

		for (const event of events) {
			const convertedEvent = this._convertTradeEvent(event);
			tradeEventMappings.set(event.id, event);
			tradeMappings.set(convertedEvent.id, convertedEvent);
		}

		const convertedEvents = [...tradeMappings.values()];
		const matchingDetails = this.matchLotsWithTrades(method, convertedEvents);
		const generatedLots = matchingDetails.lots;

		const generatedLotsWithTradeEvents = generatedLots.map((lot) => this._generateTradeEventBasedOnLot(lot, tradeEventMappings));

		const convertedLots: TaxLot<TradeEvent, TradeEvent>[] = generatedLotsWithTradeEvents.map((lotWithEvents) => {
			const lotId = lotWithEvents.lot.acquired.relation.id;
			return {
				id: lotId,
				financialIdentifier: lotWithEvents.acquiredTrade.financialIdentifier,
				quantity: lotWithEvents.lot.quantity,
				acquired: lotWithEvents.acquiredTrade,
				sold: lotWithEvents.soldTrade,
				shortLongType: GenericShortLong.LONG,
				provenance: [],
			} as TaxLot<TradeEvent, TradeEvent>;
		});

		const buys = generatedLotsWithTradeEvents.map((l) => l.acquiredTrade);
		const sells = generatedLotsWithTradeEvents.map((l) => l.soldTrade);
		const allTradesTakenFromLots = [...buys, ...sells];

		return new GenericLotMatchingDetails(convertedLots, allTradesTakenFromLots);
	}

	private _convertTradeEvent(event: TradeEvent): Trade {
		return { id: event.id, quantity: event.exchangedMoney.underlyingQuantity, date: event.date };
	}

	private _generateTradeEventBasedOnLot(
		lot: Lot,
		tradeEventMappings: Map<string, TradeEvent>,
	): GeneratedLotWithTradeEvents {
		const acquiredRelation = lot.acquired.relation;
		const soldRelation = lot.sold.relation;

		const underlyingAcquiredTrade = tradeEventMappings.get(acquiredRelation.id);
		const underlyingSoldTrade = tradeEventMappings.get(soldRelation.id);

		if (!underlyingAcquiredTrade || !underlyingSoldTrade) {
			throw new Error("Acquired Trade or Sold Trade is missing lookup");
		}

		const lotQuantity = lot.quantity;

		// Spread copy instead of deepcopy
		const clonedAcquiredTrade: TradeEvent = {
			...underlyingAcquiredTrade,
			exchangedMoney: {
				...underlyingAcquiredTrade.exchangedMoney,
				underlyingQuantity: lotQuantity,
				comissionTotal: (1 / underlyingAcquiredTrade.exchangedMoney.underlyingQuantity) *
					lotQuantity *
					underlyingAcquiredTrade.exchangedMoney.comissionTotal,
			},
		};

		const clonedSoldTrade: TradeEvent = {
			...underlyingSoldTrade,
			exchangedMoney: {
				...underlyingSoldTrade.exchangedMoney,
				underlyingQuantity: -lotQuantity,
				comissionTotal: (1 / underlyingSoldTrade.exchangedMoney.underlyingQuantity) *
					-lotQuantity *
					underlyingSoldTrade.exchangedMoney.comissionTotal,
			},
		};

		return { lot, acquiredTrade: clonedAcquiredTrade, soldTrade: clonedSoldTrade };
	}
}
