from dataclasses import dataclass

from src.Core.LotMatching.Schemas.Trade import Trade


@dataclass
class TradeAssociation:
    Quantity: float
    AssociatedTrade: Trade


class TradeAssociationTracker:

    def __init__(self) -> None:
        self.__tradeAcquiredTracker: dict[str, TradeAssociation] = dict()
        self.__tradeSoldTracker: dict[str, TradeAssociation] = dict()

    def __associateAcquiredTrade(self, event: Trade):
        if event.ID not in self.__tradeAcquiredTracker:
            self.__tradeAcquiredTracker[event.ID] = TradeAssociation(Quantity=0, AssociatedTrade=event)

    def __associateSoldTrade(self, event: Trade):
        if event.ID not in self.__tradeSoldTracker:
            self.__tradeSoldTracker[event.ID] = TradeAssociation(Quantity=0, AssociatedTrade=event)

    def trackAcquiredQuantity(self, event: Trade, quantity: float):
        self.__associateAcquiredTrade(event)

        tracker = self.__tradeAcquiredTracker.get(event.ID)
        if tracker is None:
            raise AssertionError("There is no tracker for the event ({})".format(event.ID))

        if tracker.Quantity + quantity > event.Quantity:
            raise AssertionError(
                "Adding tracking quantity ({}) to event ({}) exceeds total quantity ({} / {}) of the event".format(
                    quantity, event.ID, tracker.Quantity + quantity, event.Quantity
                )
            )

        tracker.Quantity += quantity

    def trackSoldQuantity(self, event: Trade, quantity: float):
        self.__associateSoldTrade(event)

        tracker = self.__tradeSoldTracker.get(event.ID)
        if tracker is None:
            raise AssertionError("There is no tracker for the event ({})".format(event.ID))

        if tracker.Quantity + quantity > event.Quantity.__abs__():
            raise AssertionError(
                "Adding tracking quantity ({}) to event ({}) exceeds total quantity ({} / {}) of the event".format(
                    quantity, event.ID, tracker.Quantity + quantity, event.Quantity.__abs__()
                )
            )

        tracker.Quantity += quantity

    def getAcquiredTradeTracker(self, event: Trade) -> TradeAssociation:
        tracker = self.__tradeAcquiredTracker.get(event.ID)
        if tracker is None:
            raise KeyError("Tracker for event ({}) does not exist".format(event.ID))

        return tracker

    def getSoldTradeTracker(self, event: Trade) -> TradeAssociation:
        tracker = self.__tradeSoldTracker.get(event.ID)
        if tracker is None:
            raise KeyError("Tracker for event ({}) does not exist".format(event.ID))

        return tracker
