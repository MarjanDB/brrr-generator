from dataclasses import dataclass

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent


@dataclass
class TradeAssociation:
    Quantity: float
    Trade: GenericTradeEvent


class TradeAssociationTracker:

    def __init__(self) -> None:
        self.__tradeAcquiredTracker: dict[str, TradeAssociation] = dict()
        self.__tradeSoldTracker: dict[str, TradeAssociation] = dict()

    def __associateAcquiredTrade(self, event: GenericTradeEvent):
        if event.ID not in self.__tradeAcquiredTracker:
            self.__tradeAcquiredTracker[event.ID] = TradeAssociation(Quantity=0, Trade=event)

    def __associateSoldTrade(self, event: GenericTradeEvent):
        if event.ID not in self.__tradeSoldTracker:
            self.__tradeSoldTracker[event.ID] = TradeAssociation(Quantity=0, Trade=event)

    def trackAcquiredQuantity(self, event: GenericTradeEvent, quantity: float):
        self.__associateAcquiredTrade(event)

        tracker = self.__tradeAcquiredTracker.get(event.ID)
        if tracker is None:
            raise AssertionError("There is no tracker for the event ({})".format(event.ID))

        if tracker.Quantity + quantity > event.ExchangedMoney.UnderlyingQuantity:
            raise AssertionError(
                "Adding tracking quantity ({}) to event ({}) exceeds total quantity ({} / {}) of the event".format(
                    quantity, event.ID, tracker.Quantity + quantity, event.ExchangedMoney.UnderlyingQuantity
                )
            )

        tracker.Quantity += quantity

    def trackSoldQuantity(self, event: GenericTradeEvent, quantity: float):
        self.__associateSoldTrade(event)

        tracker = self.__tradeSoldTracker.get(event.ID)
        if tracker is None:
            raise AssertionError("There is no tracker for the event ({})".format(event.ID))

        if tracker.Quantity + quantity > event.ExchangedMoney.UnderlyingQuantity.__abs__():
            raise AssertionError(
                "Adding tracking quantity ({}) to event ({}) exceeds total quantity ({} / {}) of the event".format(
                    quantity, event.ID, tracker.Quantity + quantity, event.ExchangedMoney.UnderlyingQuantity.__abs__()
                )
            )

        tracker.Quantity += quantity

    def getAcquiredTradeTracker(self, event: GenericTradeEvent) -> TradeAssociation:
        tracker = self.__tradeAcquiredTracker.get(event.ID)
        if tracker is None:
            raise KeyError("Tracker for event ({}) does not exist".format(event.ID))

        return tracker

    def getSoldTradeTracker(self, event: GenericTradeEvent) -> TradeAssociation:
        tracker = self.__tradeSoldTracker.get(event.ID)
        if tracker is None:
            raise KeyError("Tracker for event ({}) does not exist".format(event.ID))

        return tracker
