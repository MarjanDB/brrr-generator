import copy
from dataclasses import dataclass
from typing import Sequence, TypeVar

from Core.FinancialEvents.Schemas.CommonFormats import GenericShortLong
from Core.FinancialEvents.Schemas.ProcessedGenericFormats import (
    GenericTaxLot,
    GenericTradeEvent,
)
from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Schemas.Lot import Lot
from Core.LotMatching.Schemas.Trade import Trade

TAX_LOT_TYPE = TypeVar("TAX_LOT_TYPE", bound=GenericTaxLot[GenericTradeEvent, GenericTradeEvent], covariant=True)


@dataclass
class LotMatchingDetails:
    Lots: Sequence[Lot]
    Trades: Sequence[Trade]


@dataclass
class GenericLotMatchingDetails:
    Lots: Sequence[GenericTaxLot[GenericTradeEvent, GenericTradeEvent]]
    Trades: Sequence[GenericTradeEvent]


class LotMatcher:

    def matchLotsWithTrades(self, method: LotMatchingMethod, events: Sequence[Trade]) -> LotMatchingDetails:
        lots = method.performMatching(events)

        trades = method.generateTradesFromLotsWithTracking(lots)

        details = LotMatchingDetails(Lots=lots, Trades=trades)

        return details

    def matchLotsWithGenericTradeEvents(self, method: LotMatchingMethod, events: Sequence[GenericTradeEvent]) -> GenericLotMatchingDetails:

        def convertTradeEvent(event: GenericTradeEvent) -> Trade:
            trade = Trade(ID=event.ID, Quantity=event.ExchangedMoney.UnderlyingQuantity, Date=event.Date)
            return trade

        tradeEventMappings: dict[str, GenericTradeEvent] = dict()
        tradeMappings: dict[str, Trade] = dict()
        convertedGeneratedMappings: dict[str, GenericTradeEvent] = dict()

        for event in events:
            convertedEvent = convertTradeEvent(event)
            tradeEventMappings[event.ID] = event
            tradeMappings[convertedEvent.ID] = convertedEvent

        convertedEvents = list(tradeMappings.values())
        matchingDetails = self.matchLotsWithTrades(method=method, events=convertedEvents)
        generatedLots = matchingDetails.Lots
        generatedTrades = matchingDetails.Trades

        def convertTrade(trade: Trade) -> GenericTradeEvent:
            matchingGenericEvent = tradeEventMappings.get(trade.ID)

            if matchingGenericEvent is None:
                raise KeyError("Missing GenericTradeEvent for Trade ({})".format(trade.ID))

            cloned = copy.deepcopy(matchingGenericEvent)
            cloned.ExchangedMoney.UnderlyingQuantity = trade.Quantity
            return cloned

        convertedGeneratedTrades = list(map(convertTrade, generatedTrades))
        for trade in convertedGeneratedTrades:
            convertedGeneratedMappings[trade.ID] = trade

        # TODO: Get rid of ShortLong type on GenericTaxLot, this is going to have to live on some other layer (or there is a missing layer between the entities here)
        def convertLot(lot: Lot) -> GenericTaxLot[GenericTradeEvent, GenericTradeEvent]:
            lotId = lot.Acquired.Relation.ID
            acquiredTrade = convertedGeneratedMappings.get(lot.Acquired.Relation.ID)
            soldTrade = convertedGeneratedMappings.get(lot.Sold.Relation.ID)

            if acquiredTrade is None or soldTrade is None:
                raise ValueError("Acquired Trade or Sold Trade is missing lookup")

            newLot = GenericTaxLot(
                ID=lotId,
                ISIN=acquiredTrade.ISIN,
                Quantity=lot.Quantity,
                Acquired=acquiredTrade,
                Sold=soldTrade,
                ShortLongType=GenericShortLong.LONG,
            )

            return newLot

        convertedLots = list(map(convertLot, generatedLots))

        details = GenericLotMatchingDetails(Lots=convertedLots, Trades=convertedGeneratedTrades)

        return details
