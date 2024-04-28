from dataclasses import dataclass

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent


@dataclass
class TradeAssociation:
    Quantity: float
    Trade: GenericTradeEvent


class TradeAssociationTracker:
    tradeAcquiredTracker: dict[GenericTradeEvent, TradeAssociation] = dict()
    tradeSoldTracker: dict[GenericTradeEvent, TradeAssociation] = dict()

    def associateAcquiredTrade(self, event: GenericTradeEvent):
        if event not in self.tradeAcquiredTracker:
            self.tradeAcquiredTracker[event] = TradeAssociation(0, event)

    def associateSoldTrade(self, event: GenericTradeEvent):
        if event not in self.tradeSoldTracker:
            self.tradeSoldTracker[event] = TradeAssociation(0, event)

    def trackAcquiredQuantity(self, event: GenericTradeEvent, quantity: float):
        self.associateAcquiredTrade(event)

        tracker = self.tradeAcquiredTracker.get(event)
        if tracker is None:
            raise AssertionError("There is no tracker for the event ({})".format(event.ID))

        if tracker.Quantity + quantity > event.ExchangedMoney.UnderlyingQuantity:
            raise AssertionError(
                "Adding tracking quantity ({}) to event ({}) exceeds total quantity ({}) of the event".format(
                    quantity, event.ID, event.ExchangedMoney.UnderlyingQuantity
                )
            )

        tracker.Quantity += quantity

    def trackSoldQuantity(self, event: GenericTradeEvent, quantity: float):
        self.associateSoldTrade(event)

        tracker = self.tradeSoldTracker.get(event)
        if tracker is None:
            raise AssertionError("There is no tracker for the event ({})".format(event.ID))

        if tracker.Quantity + quantity > event.ExchangedMoney.UnderlyingQuantity:
            raise AssertionError(
                "Adding tracking quantity ({}) to event ({}) exceeds total quantity ({}) of the event".format(
                    quantity, event.ID, event.ExchangedMoney.UnderlyingQuantity
                )
            )

        tracker.Quantity += quantity
