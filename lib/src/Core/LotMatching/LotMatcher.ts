import type { Lot } from "@brrr/Core/LotMatching/Lot";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats";
import type { TradeEventBase } from "@brrr/Core/Schemas/Events";
import { TaxLot } from "@brrr/Core/Schemas/Lots";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type GeneratedLotWithTradeEvents<T extends TradeEventBase> = {
	lot: Lot;
	acquiredTrade: T;
	soldTrade: T;
};

export class GenericLotMatchingDetails<T extends TradeEventBase> {
	public readonly lots: TaxLot<T, T>[];
	public readonly trades: T[];

	constructor(args: { lots: TaxLot<T, T>[]; trades: T[] }) {
		this.lots = args.lots;
		this.trades = args.trades;
	}

	getTradesOfLotsClosedInPeriod(
		periodStart: ValidDateTime,
		periodEnd: ValidDateTime,
	): GenericLotMatchingDetails<T> {
		const lotsClosedInPeriod = this.lots.filter(
			(lot) => lot.sold.date >= periodStart && lot.sold.date <= periodEnd,
		);

		const lotAcquiredTrades = lotsClosedInPeriod.map((lot) => lot.acquired);
		const lotSoldTrades = lotsClosedInPeriod.map((lot) => lot.sold);
		const allTrades = [...lotAcquiredTrades, ...lotSoldTrades];

		const sortedTrades = [...allTrades].sort((a, b) => a.date.toMillis() - b.date.toMillis());

		return new GenericLotMatchingDetails({ lots: lotsClosedInPeriod, trades: sortedTrades });
	}
}

export class LotMatcher {
	matchLotsWithGenericTradeEvents<T extends TradeEventBase>(
		method: LotMatchingMethod,
		events: T[],
	): GenericLotMatchingDetails<T> {
		const tradeEventMappings = new Map<string, T>();
		const tradeMappings = new Map<string, Trade>();

		for (const event of events) {
			const convertedEvent = this.convertTradeEvent(event);
			tradeEventMappings.set(event.id, event);
			tradeMappings.set(convertedEvent.id, convertedEvent);
		}

		const generatedLots = method.performMatching([...tradeMappings.values()]);

		const generatedLotsWithTradeEvents = generatedLots.map((lot) =>
			this.generateTradeEventBasedOnLot(lot, tradeEventMappings),
		);

		const convertedLots = generatedLotsWithTradeEvents.map(
			(lotWithEvents) =>
				new TaxLot<T, T>({
					id: lotWithEvents.lot.acquired.relation.id,
					financialIdentifier: lotWithEvents.acquiredTrade.financialIdentifier,
					quantity: lotWithEvents.lot.quantity,
					acquired: lotWithEvents.acquiredTrade,
					sold: lotWithEvents.soldTrade,
					shortLongType: GenericShortLong.LONG,
					provenance: [],
				}),
		);

		const buys = generatedLotsWithTradeEvents.map((l) => l.acquiredTrade);
		const sells = generatedLotsWithTradeEvents.map((l) => l.soldTrade);

		return new GenericLotMatchingDetails({ lots: convertedLots, trades: [...buys, ...sells] });
	}

	private convertTradeEvent(event: TradeEventBase): Trade {
		return { id: event.id, quantity: event.exchangedMoney.underlyingQuantity, date: event.date };
	}

	private generateTradeEventBasedOnLot<T extends TradeEventBase>(
		lot: Lot,
		tradeEventMappings: Map<string, T>,
	): GeneratedLotWithTradeEvents<T> {
		const underlyingAcquiredTrade = tradeEventMappings.get(lot.acquired.relation.id);
		const underlyingSoldTrade = tradeEventMappings.get(lot.sold.relation.id);

		if (!underlyingAcquiredTrade || !underlyingSoldTrade) {
			throw new Error("Acquired Trade or Sold Trade is missing lookup");
		}

		const lotQuantity = lot.quantity;

		const clonedAcquiredTrade = underlyingAcquiredTrade.copy({
			exchangedMoney: underlyingAcquiredTrade.exchangedMoney.copy({
				underlyingQuantity: lotQuantity,
				commissionTotal:
					(1 / underlyingAcquiredTrade.exchangedMoney.underlyingQuantity) *
					lotQuantity *
					underlyingAcquiredTrade.exchangedMoney.commissionTotal,
			}),
		});

		const clonedSoldTrade = underlyingSoldTrade.copy({
			exchangedMoney: underlyingSoldTrade.exchangedMoney.copy({
				underlyingQuantity: -lotQuantity,
				commissionTotal:
					(1 / underlyingSoldTrade.exchangedMoney.underlyingQuantity) *
					-lotQuantity *
					underlyingSoldTrade.exchangedMoney.commissionTotal,
			}),
		});

		return { lot, acquiredTrade: clonedAcquiredTrade, soldTrade: clonedSoldTrade };
	}
}
