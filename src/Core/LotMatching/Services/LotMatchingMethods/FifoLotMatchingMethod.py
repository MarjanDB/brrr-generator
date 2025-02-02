from collections import deque
from typing import Sequence

import numpy as np

from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Schemas.Lot import Lot, LotAcquired, LotSold
from Core.LotMatching.Schemas.Trade import Trade
from Core.LotMatching.Services.TradeAssociationTracker import TradeAssociationTracker


class TrackingTradeBuySellSide:
    BuySide: Trade
    SellSide: Trade

    CandidateEvent: Trade
    EarliestEventWaitingForMatch: Trade

    def __init__(self, candidateEvent: Trade, earliestEventWaitingForMatch: Trade):
        self.CandidateEvent = candidateEvent
        self.EarliestEventWaitingForMatch = earliestEventWaitingForMatch

        if earliestEventWaitingForMatch.Quantity < 0:
            self.BuySide = candidateEvent
            self.SellSide = earliestEventWaitingForMatch
        else:
            self.BuySide = earliestEventWaitingForMatch
            self.SellSide = candidateEvent

    def confirmConsumedQuantity(self, quantity: float, tracker: TradeAssociationTracker):
        tracker.trackAcquiredQuantity(self.BuySide, quantity)
        tracker.trackSoldQuantity(self.SellSide, -quantity)

    def getRemainingQuantity(self, of: Trade, tracker: TradeAssociationTracker):
        if of == self.BuySide:
            return of.Quantity - tracker.getAcquiredTradeTracker(of).Quantity
        else:
            return of.Quantity - tracker.getSoldTradeTracker(of).Quantity


class FifoLotMatchingMethod(LotMatchingMethod):
    def performMatching(self, events: Sequence[Trade]) -> Sequence[Lot]:

        # Nothing to match with
        if len(events) == 0:
            return []

        # All events are of the same type, so we can't make a lot
        if len([x for x in events if x.Quantity > 0]) == len(events) or len([x for x in events if x.Quantity < 0]) == len(events):
            return []

        # At this point we know that there are at least two events: one buy and one sell
        sortedEvents = sorted(events, key=lambda x: x.Date)

        createdLots: list[Lot] = []
        eventBacklog: deque[Trade] = deque(sortedEvents)  # Standard Queue is missing type stubs, so using deque
        eventBacklog.reverse()

        eventsWaitingForMatchingEventsToMakeLot: deque[Trade] = deque()
        eventsWaitingForMatchingEventsToMakeLot.appendleft(eventBacklog.pop())

        while len(eventBacklog) > 0:
            newCandidateEvent = eventBacklog.pop()

            # If there are no events waiting for a matching event, we can just add the new candidate event to that queue
            if len(eventsWaitingForMatchingEventsToMakeLot) == 0:
                eventsWaitingForMatchingEventsToMakeLot.append(newCandidateEvent)
                continue

            earliestEventWaitingForMatch = eventsWaitingForMatchingEventsToMakeLot[-1]

            # The most common case is when the quantities don't cancel out
            # And the sign of the quantities are the same
            # This means we just add it onto the events waiting for a match
            if np.sign(earliestEventWaitingForMatch.Quantity) == np.sign(newCandidateEvent.Quantity):
                eventsWaitingForMatchingEventsToMakeLot.appendleft(newCandidateEvent)
                continue

            trackingTradeBuySellSide = TrackingTradeBuySellSide(
                candidateEvent=newCandidateEvent, earliestEventWaitingForMatch=earliestEventWaitingForMatch
            )

            self.tradeAssociationTracker.trackTrade(trackingTradeBuySellSide.BuySide)
            self.tradeAssociationTracker.trackTrade(trackingTradeBuySellSide.SellSide)

            if trackingTradeBuySellSide.BuySide.ID == trackingTradeBuySellSide.CandidateEvent.ID:
                newCandidateEventQuantity = (
                    trackingTradeBuySellSide.CandidateEvent.Quantity
                    - self.tradeAssociationTracker.getAcquiredTradeTracker(trackingTradeBuySellSide.CandidateEvent).Quantity
                )
                earliestEventWaitingForMatchQuantity = (
                    trackingTradeBuySellSide.EarliestEventWaitingForMatch.Quantity
                    - self.tradeAssociationTracker.getSoldTradeTracker(trackingTradeBuySellSide.EarliestEventWaitingForMatch).Quantity
                )
            else:
                earliestEventWaitingForMatchQuantity = (
                    trackingTradeBuySellSide.EarliestEventWaitingForMatch.Quantity
                    - self.tradeAssociationTracker.getAcquiredTradeTracker(trackingTradeBuySellSide.EarliestEventWaitingForMatch).Quantity
                )
                newCandidateEventQuantity = (
                    trackingTradeBuySellSide.CandidateEvent.Quantity
                    - self.tradeAssociationTracker.getSoldTradeTracker(trackingTradeBuySellSide.CandidateEvent).Quantity
                )

            # At this point we know we'll be consuming the earliest event waiting for a match
            eventsWaitingForMatchingEventsToMakeLot.pop()

            # Most common and easiest case is when the quantities cancel out
            doQuantitiesMatch = earliestEventWaitingForMatchQuantity + newCandidateEventQuantity == 0
            if doQuantitiesMatch:
                quantityOfLot = abs(newCandidateEventQuantity)  # Since they're the same, we can just use the quantity of the starting event

                trackingTradeBuySellSide.confirmConsumedQuantity(quantityOfLot, self.tradeAssociationTracker)
                buySideTrade = trackingTradeBuySellSide.BuySide
                sellSideTrade = trackingTradeBuySellSide.SellSide

                buySideOfLot: LotAcquired = LotAcquired(Date=buySideTrade.Date, Relation=buySideTrade)
                sellSideOfLot: LotSold = LotSold(Date=sellSideTrade.Date, Relation=sellSideTrade)

                createdLots.append(Lot(Quantity=quantityOfLot, Acquired=buySideOfLot, Sold=sellSideOfLot))
                continue

            # If the quantities don't cancel out and the signs are different, we need to generate Lots
            # Since we know the quantities don't cancel out, we need to consume all the events waiting for a match
            # we do this until we've exhausted either the newCandidateEvent or the events waiting for a match
            # At which point, we either put the remainder of the newCandidateEvent back into the event backlog
            # (to be the first one to be matched in the next iteration)
            # or we push the remainder of the events waiting for a match onto the event backlog (switching position from long to short or short to long)

            quantityAvailableToConsumeFromNewCandidateEvent = trackingTradeBuySellSide.getRemainingQuantity(
                trackingTradeBuySellSide.CandidateEvent, self.tradeAssociationTracker
            )
            quantityAvailableToConsumeFromEarliestEventWaitingForMatch = trackingTradeBuySellSide.getRemainingQuantity(
                trackingTradeBuySellSide.EarliestEventWaitingForMatch, self.tradeAssociationTracker
            )

            if (
                abs(quantityAvailableToConsumeFromNewCandidateEvent) > 0
                and abs(quantityAvailableToConsumeFromEarliestEventWaitingForMatch) > 0
            ):

                willConsumeQuantity = min(
                    abs(quantityAvailableToConsumeFromNewCandidateEvent), abs(quantityAvailableToConsumeFromEarliestEventWaitingForMatch)
                )

                trackingTradeBuySellSide.confirmConsumedQuantity(willConsumeQuantity, self.tradeAssociationTracker)

                acquired = LotAcquired(Date=earliestEventWaitingForMatch.Date, Relation=earliestEventWaitingForMatch)
                sold = LotSold(Date=newCandidateEvent.Date, Relation=newCandidateEvent)
                createdLots.append(Lot(Quantity=willConsumeQuantity, Acquired=acquired, Sold=sold))

                quantityAvailableToConsumeFromNewCandidateEvent = trackingTradeBuySellSide.getRemainingQuantity(
                    trackingTradeBuySellSide.CandidateEvent, self.tradeAssociationTracker
                )
                quantityAvailableToConsumeFromEarliestEventWaitingForMatch = trackingTradeBuySellSide.getRemainingQuantity(
                    trackingTradeBuySellSide.EarliestEventWaitingForMatch, self.tradeAssociationTracker
                )

                # If we've consumed the earliest event waiting for a match,
                # and we've yet to fully process the new candidate event,
                # we can just put the new candidate back into queue for it to be processed again
                if (
                    quantityAvailableToConsumeFromEarliestEventWaitingForMatch == 0
                    and len(eventsWaitingForMatchingEventsToMakeLot) > 0
                    and quantityAvailableToConsumeFromNewCandidateEvent != 0
                ):
                    eventBacklog.append(trackingTradeBuySellSide.CandidateEvent)

                # However, if we've consumed the new candidate event,
                # but haven't fully consumed the earliest event waiting for a match,
                # we should put it back into the queue for it to be processed again
                if quantityAvailableToConsumeFromNewCandidateEvent == 0 and quantityAvailableToConsumeFromEarliestEventWaitingForMatch != 0:
                    eventsWaitingForMatchingEventsToMakeLot.append(earliestEventWaitingForMatch)

        return createdLots

    def generateTradesFromLotsWithTracking(self, lots: Sequence[Lot]) -> Sequence[Trade]:
        processedTrades: dict[str, Trade] = dict()

        for lot in lots:
            acquiredTrade = lot.Acquired.Relation

            acquiredTradeTracking = self.tradeAssociationTracker.getAcquiredTradeTracker(acquiredTrade)
            accountedForAcquiredQuantity = acquiredTradeTracking.Quantity

            acquiredTradeProcessed = Trade(ID=acquiredTrade.ID, Quantity=accountedForAcquiredQuantity, Date=acquiredTrade.Date)
            processedTrades[acquiredTrade.ID] = acquiredTradeProcessed

            soldTrade = lot.Sold.Relation
            soldTradeTracking = self.tradeAssociationTracker.getSoldTradeTracker(soldTrade)
            accountedForSoldQuantity = soldTradeTracking.Quantity

            soldTradeProcessed = Trade(ID=soldTrade.ID, Quantity=accountedForSoldQuantity, Date=soldTrade.Date)
            processedTrades[soldTrade.ID] = soldTradeProcessed

        processedTradesValues = list(processedTrades.values())

        processedTradesValues.sort(key=lambda trade: trade.Date)

        return processedTradesValues
