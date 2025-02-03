import copy
from dataclasses import dataclass
from typing import Self, Sequence, TypeVar

from arrow import Arrow

from Core.FinancialEvents.Schemas.CommonFormats import GenericShortLong
from Core.FinancialEvents.Schemas.Events import TradeEvent
from Core.FinancialEvents.Schemas.Lots import TaxLot
from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Schemas.Lot import Lot
from Core.LotMatching.Schemas.Trade import Trade

TAX_LOT_TYPE = TypeVar("TAX_LOT_TYPE", bound=TaxLot[TradeEvent, TradeEvent], covariant=True)


@dataclass
class LotMatchingDetails:
    Lots: Sequence[Lot]
    Trades: Sequence[Trade]


class GenericLotMatchingDetails:
    Lots: Sequence[TaxLot[TradeEvent, TradeEvent]]
    Trades: Sequence[TradeEvent]

    def __init__(self, lots: Sequence[TaxLot[TradeEvent, TradeEvent]], trades: Sequence[TradeEvent]):
        self.Lots = lots
        self.Trades = trades

    def getTradesOfLotsClosedInPeriod(self, periodStart: Arrow, periodEnd: Arrow) -> Self:
        lotsClosedInPeriod = list(filter(lambda lot: lot.Sold.Date >= periodStart and lot.Sold.Date <= periodEnd, self.Lots))

        lotAcquiredTrades = list(map(lambda lot: lot.Acquired, lotsClosedInPeriod))
        lotSoldTrades = list(map(lambda lot: lot.Sold, lotsClosedInPeriod))
        allTrades = lotAcquiredTrades + lotSoldTrades

        sortedTrades = sorted(allTrades, key=lambda trade: trade.Date)

        return self.__class__(lots=lotsClosedInPeriod, trades=sortedTrades)


class LotMatcher:

    def matchLotsWithTrades(self, method: LotMatchingMethod, events: Sequence[Trade]) -> LotMatchingDetails:
        lots = method.performMatching(events)

        trades = method.generateTradesFromLotsWithTracking(lots)

        details = LotMatchingDetails(Lots=lots, Trades=trades)

        return details

    def matchLotsWithGenericTradeEvents(self, method: LotMatchingMethod, events: Sequence[TradeEvent]) -> GenericLotMatchingDetails:

        tradeEventMappings: dict[str, TradeEvent] = dict()
        tradeMappings: dict[str, Trade] = dict()
        convertedGeneratedMappings: dict[str, TradeEvent] = dict()

        for event in events:
            convertedEvent = self._convertTradeEvent(event)
            tradeEventMappings[event.ID] = event
            tradeMappings[convertedEvent.ID] = convertedEvent

        convertedEvents = list(tradeMappings.values())
        matchingDetails = self.matchLotsWithTrades(method=method, events=convertedEvents)
        generatedLots = matchingDetails.Lots
        generatedTrades = matchingDetails.Trades

        convertedGeneratedTrades = list(map(lambda trade: self._convertTrade(trade, tradeEventMappings), generatedTrades))
        for trade in convertedGeneratedTrades:
            convertedGeneratedMappings[trade.ID] = trade

        # TODO: Get rid of ShortLong type on GenericTaxLot, this is going to have to live on some other layer (or there is a missing layer between the entities here)
        def convertLot(lot: Lot) -> TaxLot[TradeEvent, TradeEvent]:
            lotId = lot.Acquired.Relation.ID
            acquiredTrade = convertedGeneratedMappings.get(lot.Acquired.Relation.ID)
            soldTrade = convertedGeneratedMappings.get(lot.Sold.Relation.ID)

            if acquiredTrade is None or soldTrade is None:
                raise ValueError("Acquired Trade or Sold Trade is missing lookup")

            newLot = TaxLot(
                ID=lotId,
                ISIN=acquiredTrade.ISIN,
                Quantity=lot.Quantity,
                Acquired=acquiredTrade,
                Sold=soldTrade,
                ShortLongType=GenericShortLong.LONG,
            )

            return newLot

        convertedLots = list(map(convertLot, generatedLots))

        details = GenericLotMatchingDetails(lots=convertedLots, trades=convertedGeneratedTrades)

        return details

    def _convertTradeEvent(self, event: TradeEvent) -> Trade:
        trade = Trade(ID=event.ID, Quantity=event.ExchangedMoney.UnderlyingQuantity, Date=event.Date)
        return trade

    def _convertTrade(self, trade: Trade, tradeEventMappings: dict[str, TradeEvent]) -> TradeEvent:
        matchingGenericEvent = tradeEventMappings.get(trade.ID)

        if matchingGenericEvent is None:
            raise KeyError("Missing TradeEvent for Trade ({})".format(trade.ID))

        cloned = copy.deepcopy(matchingGenericEvent)
        cloned.ExchangedMoney.UnderlyingQuantity = trade.Quantity
        return cloned
