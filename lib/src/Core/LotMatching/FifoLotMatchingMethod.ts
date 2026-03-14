import type { Lot } from "@brrr/Core/LotMatching/Lot";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import { TradeAssociationTracker } from "@brrr/Core/LotMatching/TradeAssociationTracker";

class TrackingTradeBuySellSide {
	buySide: Trade;
	sellSide: Trade;
	candidateEvent: Trade;
	earliestEventWaitingForMatch: Trade;

	constructor(candidateEvent: Trade, earliestEventWaitingForMatch: Trade) {
		this.candidateEvent = candidateEvent;
		this.earliestEventWaitingForMatch = earliestEventWaitingForMatch;

		if (earliestEventWaitingForMatch.quantity < 0) {
			this.buySide = candidateEvent;
			this.sellSide = earliestEventWaitingForMatch;
		} else {
			this.buySide = earliestEventWaitingForMatch;
			this.sellSide = candidateEvent;
		}
	}

	confirmConsumedQuantity(quantity: number, tracker: TradeAssociationTracker): void {
		tracker.trackAcquiredQuantity(this.buySide, quantity);
		tracker.trackSoldQuantity(this.sellSide, -quantity);
	}

	getRemainingQuantity(of: Trade, tracker: TradeAssociationTracker): number {
		if (of === this.buySide) {
			return of.quantity - tracker.getAcquiredTradeTracker(of).quantity;
		} else {
			return of.quantity - tracker.getSoldTradeTracker(of).quantity;
		}
	}
}

export class FifoLotMatchingMethod implements LotMatchingMethod {
	private tradeAssociationTracker: TradeAssociationTracker = new TradeAssociationTracker();

	performMatching(events: Trade[]): Lot[] {
		// Reset tracker for each matching run
		this.tradeAssociationTracker = new TradeAssociationTracker();

		if (events.length === 0) return [];

		const allBuys = events.filter((x) => x.quantity > 0);
		const allSells = events.filter((x) => x.quantity < 0);
		if (allBuys.length === events.length || allSells.length === events.length) return [];

		const sortedEvents = [...events].sort((a, b) => a.date.toMillis() - b.date.toMillis());

		const createdLots: Lot[] = [];
		// Use arrays as queues (push to front = unshift, pop from back = pop)
		// eventBacklog: reversed sorted events (pop() gives earliest first)
		const eventBacklog: Trade[] = [...sortedEvents].reverse();
		const eventsWaitingForMatch: Trade[] = [];

		eventsWaitingForMatch.push(eventBacklog.pop()!);

		while (eventBacklog.length > 0) {
			const newCandidateEvent = eventBacklog.pop()!;

			if (eventsWaitingForMatch.length === 0) {
				eventsWaitingForMatch.push(newCandidateEvent);
				continue;
			}

			const earliestEventWaitingForMatch = eventsWaitingForMatch[eventsWaitingForMatch.length - 1];

			// Same sign: queue it
			if (Math.sign(earliestEventWaitingForMatch.quantity) === Math.sign(newCandidateEvent.quantity)) {
				eventsWaitingForMatch.unshift(newCandidateEvent);
				continue;
			}

			const tracking = new TrackingTradeBuySellSide(newCandidateEvent, earliestEventWaitingForMatch);

			this.tradeAssociationTracker.trackTrade(tracking.buySide);
			this.tradeAssociationTracker.trackTrade(tracking.sellSide);

			let newCandidateEventQuantity: number;
			let earliestEventWaitingForMatchQuantity: number;

			if (tracking.buySide.id === tracking.candidateEvent.id) {
				newCandidateEventQuantity = tracking.candidateEvent.quantity -
					this.tradeAssociationTracker.getAcquiredTradeTracker(tracking.candidateEvent).quantity;
				earliestEventWaitingForMatchQuantity = tracking.earliestEventWaitingForMatch.quantity -
					this.tradeAssociationTracker.getSoldTradeTracker(tracking.earliestEventWaitingForMatch).quantity;
			} else {
				earliestEventWaitingForMatchQuantity = tracking.earliestEventWaitingForMatch.quantity -
					this.tradeAssociationTracker.getAcquiredTradeTracker(tracking.earliestEventWaitingForMatch).quantity;
				newCandidateEventQuantity = tracking.candidateEvent.quantity -
					this.tradeAssociationTracker.getSoldTradeTracker(tracking.candidateEvent).quantity;
			}

			// Consume the earliest event waiting for match
			eventsWaitingForMatch.pop();

			const doQuantitiesMatch = earliestEventWaitingForMatchQuantity + newCandidateEventQuantity === 0;
			if (doQuantitiesMatch) {
				const quantityOfLot = Math.abs(newCandidateEventQuantity);
				tracking.confirmConsumedQuantity(quantityOfLot, this.tradeAssociationTracker);

				createdLots.push({
					quantity: quantityOfLot,
					acquired: { date: tracking.buySide.date, relation: tracking.buySide },
					sold: { date: tracking.sellSide.date, relation: tracking.sellSide },
				});
				continue;
			}

			let quantityAvailableFromCandidate = tracking.getRemainingQuantity(
				tracking.candidateEvent,
				this.tradeAssociationTracker,
			);
			let quantityAvailableFromEarliest = tracking.getRemainingQuantity(
				tracking.earliestEventWaitingForMatch,
				this.tradeAssociationTracker,
			);

			if (Math.abs(quantityAvailableFromCandidate) > 0 && Math.abs(quantityAvailableFromEarliest) > 0) {
				const willConsumeQuantity = Math.min(
					Math.abs(quantityAvailableFromCandidate),
					Math.abs(quantityAvailableFromEarliest),
				);

				tracking.confirmConsumedQuantity(willConsumeQuantity, this.tradeAssociationTracker);

				createdLots.push({
					quantity: willConsumeQuantity,
					acquired: { date: earliestEventWaitingForMatch.date, relation: earliestEventWaitingForMatch },
					sold: { date: newCandidateEvent.date, relation: newCandidateEvent },
				});

				quantityAvailableFromCandidate = tracking.getRemainingQuantity(
					tracking.candidateEvent,
					this.tradeAssociationTracker,
				);
				quantityAvailableFromEarliest = tracking.getRemainingQuantity(
					tracking.earliestEventWaitingForMatch,
					this.tradeAssociationTracker,
				);

				if (
					quantityAvailableFromEarliest === 0 &&
					eventsWaitingForMatch.length > 0 &&
					quantityAvailableFromCandidate !== 0
				) {
					eventBacklog.push(tracking.candidateEvent);
				}

				if (quantityAvailableFromCandidate === 0 && quantityAvailableFromEarliest !== 0) {
					eventsWaitingForMatch.push(earliestEventWaitingForMatch);
				}
			}
		}

		return createdLots;
	}

	generateTradesFromLotsWithTracking(lots: Lot[]): Trade[] {
		const processedTrades = new Map<string, Trade>();

		for (const lot of lots) {
			const acquiredTrade = lot.acquired.relation;
			const acquiredTracking = this.tradeAssociationTracker.getAcquiredTradeTracker(acquiredTrade);
			processedTrades.set(acquiredTrade.id, {
				id: acquiredTrade.id,
				quantity: acquiredTracking.quantity,
				date: acquiredTrade.date,
			});

			const soldTrade = lot.sold.relation;
			const soldTracking = this.tradeAssociationTracker.getSoldTradeTracker(soldTrade);
			processedTrades.set(soldTrade.id, {
				id: soldTrade.id,
				quantity: soldTracking.quantity,
				date: soldTrade.date,
			});
		}

		return [...processedTrades.values()].sort((a, b) => a.date.toMillis() - b.date.toMillis());
	}
}
