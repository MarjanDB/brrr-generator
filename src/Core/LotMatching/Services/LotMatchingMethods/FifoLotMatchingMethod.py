from collections import deque
from typing import Sequence

import numpy as np

from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Schemas.Lot import Lot, LotAcquired, LotSold
from Core.LotMatching.Schemas.Trade import Trade


class FifoLotMatchingMethod(LotMatchingMethod):

    class WorkingOnLot:
        def __init__(self, lot: Lot):
            self.lot = lot
            self.remainingQuantity = lot.Quantity

    def performMatching(self, events: Sequence[Trade]) -> Sequence[Lot]:

        # Nothing to match with
        if len(events) == 0:
            return []

        # All events are of the same type, so we can't make a lot
        if len([x for x in events if x.Quantity > 0]) == len(events) or len([x for x in events if x.Quantity < 0]) == len(events):
            return []

        # At this point we know that there are at least two events: one buy and one sell

        createdLots: list[Lot] = []
        eventBacklog: deque[Trade] = deque(events)  # Standard Queue is missing type stubs, so using deque
        eventBacklog.reverse()

        eventsWaitingForMatchingEventsToMakeLot: deque[Trade] = deque()
        eventsWaitingForMatchingEventsToMakeLot.appendleft(eventBacklog.pop())

        while len(eventBacklog) > 0:
            newCandidateEvent = eventBacklog.pop()

            earlistEventWaitingForMatch = eventsWaitingForMatchingEventsToMakeLot[-1]

            # Most common and easiest case is when the quantities cancel out
            doQuantitiesMatch = earlistEventWaitingForMatch.Quantity + newCandidateEvent.Quantity == 0
            if doQuantitiesMatch:
                startingEventOfLot = eventsWaitingForMatchingEventsToMakeLot.pop()
                endingEventOfLot = newCandidateEvent
                quantityOfLot = startingEventOfLot.Quantity  # Since they're the same, we can just use the quantity of the starting event

                buySideOfLot: LotAcquired = LotAcquired(Date=startingEventOfLot.Date, Relation=startingEventOfLot)
                sellSideOfLot: LotSold = LotSold(Date=endingEventOfLot.Date, Relation=endingEventOfLot)

                createdLots.append(Lot(Quantity=quantityOfLot, Acquired=buySideOfLot, Sold=sellSideOfLot))
                continue

            # Next most common case is when the quantities don't cancel out
            # And the sign of the quantities are the same
            # This means we just add it onto the events waiting for a match
            if np.sign(earlistEventWaitingForMatch.Quantity) == np.sign(newCandidateEvent.Quantity):
                eventsWaitingForMatchingEventsToMakeLot.appendleft(newCandidateEvent)
                continue

            # If the quantities don't cancel out and the signs are different, we need to make a lot
            # Since we know the quantities don't cancel out, we need to consume all the events waiting for a match
            # Until we've exhausted either the newCandidateEvent or the events waiting for a match

        return createdLots

    def generateTradesFromLotsWithTracking(self, lots: Sequence[Lot]) -> Sequence[Trade]:

        return []
