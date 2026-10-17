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
	performMatching(events: Trade[]): Lot[] {
		const tracker = new TradeAssociationTracker();

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

		// biome-ignore lint/style/noNonNullAssertion: eventBacklog is non-empty (sortedEvents guaranteed non-empty at this point)
		eventsWaitingForMatch.push(eventBacklog.pop()!);

		while (eventBacklog.length > 0) {
			// biome-ignore lint/style/noNonNullAssertion: length > 0 guarantees pop() returns a value
			const newCandidateEvent = eventBacklog.pop()!;

			if (eventsWaitingForMatch.length === 0) {
				eventsWaitingForMatch.push(newCandidateEvent);
				continue;
			}

			const earliestEventWaitingForMatch = eventsWaitingForMatch[eventsWaitingForMatch.length - 1];

			// Same sign: queue it
			if (
				Math.sign(earliestEventWaitingForMatch.quantity) === Math.sign(newCandidateEvent.quantity)
			) {
				eventsWaitingForMatch.unshift(newCandidateEvent);
				continue;
			}

			const tracking = new TrackingTradeBuySellSide(
				newCandidateEvent,
				earliestEventWaitingForMatch,
			);

			tracker.trackTrade(tracking.buySide);
			tracker.trackTrade(tracking.sellSide);

			let newCandidateEventQuantity: number;
			let earliestEventWaitingForMatchQuantity: number;

			if (tracking.buySide.id === tracking.candidateEvent.id) {
				newCandidateEventQuantity =
					tracking.candidateEvent.quantity -
					tracker.getAcquiredTradeTracker(tracking.candidateEvent).quantity;
				earliestEventWaitingForMatchQuantity =
					tracking.earliestEventWaitingForMatch.quantity -
					tracker.getSoldTradeTracker(tracking.earliestEventWaitingForMatch).quantity;
			} else {
				earliestEventWaitingForMatchQuantity =
					tracking.earliestEventWaitingForMatch.quantity -
					tracker.getAcquiredTradeTracker(tracking.earliestEventWaitingForMatch).quantity;
				newCandidateEventQuantity =
					tracking.candidateEvent.quantity -
					tracker.getSoldTradeTracker(tracking.candidateEvent).quantity;
			}

			// Consume the earliest event waiting for match
			eventsWaitingForMatch.pop();

			const doQuantitiesMatch =
				earliestEventWaitingForMatchQuantity + newCandidateEventQuantity === 0;
			if (doQuantitiesMatch) {
				const quantityOfLot = Math.abs(newCandidateEventQuantity);
				tracking.confirmConsumedQuantity(quantityOfLot, tracker);

				createdLots.push({
					quantity: quantityOfLot,
					acquired: { relation: tracking.buySide },
					sold: { relation: tracking.sellSide },
				});
				continue;
			}

			let quantityAvailableFromCandidate = tracking.getRemainingQuantity(
				tracking.candidateEvent,
				tracker,
			);
			let quantityAvailableFromEarliest = tracking.getRemainingQuantity(
				tracking.earliestEventWaitingForMatch,
				tracker,
			);

			if (
				Math.abs(quantityAvailableFromCandidate) > 0 &&
				Math.abs(quantityAvailableFromEarliest) > 0
			) {
				const willConsumeQuantity = Math.min(
					Math.abs(quantityAvailableFromCandidate),
					Math.abs(quantityAvailableFromEarliest),
				);

				tracking.confirmConsumedQuantity(willConsumeQuantity, tracker);

				createdLots.push({
					quantity: willConsumeQuantity,
					acquired: { relation: earliestEventWaitingForMatch },
					sold: { relation: newCandidateEvent },
				});

				quantityAvailableFromCandidate = tracking.getRemainingQuantity(
					tracking.candidateEvent,
					tracker,
				);
				quantityAvailableFromEarliest = tracking.getRemainingQuantity(
					tracking.earliestEventWaitingForMatch,
					tracker,
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

		// Every lot must run from a tracked buy to a tracked sell. A short covered in several fills
		// produces a lot whose acquired side is the sell; the tracker lookup throws for it, so it
		// never reaches a report.
		for (const lot of createdLots) {
			tracker.getAcquiredTradeTracker(lot.acquired.relation);
			tracker.getSoldTradeTracker(lot.sold.relation);
		}

		return createdLots;
	}
}
