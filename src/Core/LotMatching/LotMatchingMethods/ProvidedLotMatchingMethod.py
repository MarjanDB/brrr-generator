from typing import Sequence

from Core.FinancialEvents.Schemas.ProcessedGenericFormats import (
    GenericTaxLot,
    GenericTradeEvent,
)
from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Schemas.Lot import Lot, LotAcquired, LotSold
from Core.LotMatching.Schemas.Trade import Trade


class ProvidedLotMatchingMethod(LotMatchingMethod):
    def __init__(self, predefinedLots: Sequence[GenericTaxLot[GenericTradeEvent, GenericTradeEvent]]) -> None:
        super().__init__()
        self.predefinedLots: Sequence[GenericTaxLot[GenericTradeEvent, GenericTradeEvent]] = predefinedLots

    def performMatching(self, events: Sequence[Trade]) -> Sequence[Lot]:

        lots = self.predefinedLots

        for lot in lots:
            acquiredTrade = Trade(ID=lot.Acquired.ID, Quantity=lot.Acquired.ExchangedMoney.UnderlyingQuantity, Date=lot.Acquired.Date)
            self.tradeAssociationTracker.trackAcquiredQuantity(acquiredTrade, lot.Quantity)

            # NOTE: Lots subtract, as sells remove from holding
            soldTrade = Trade(ID=lot.Sold.ID, Quantity=lot.Sold.ExchangedMoney.UnderlyingQuantity, Date=lot.Sold.Date)
            self.tradeAssociationTracker.trackSoldQuantity(soldTrade, -lot.Quantity)

        processedLots: list[Lot] = []
        for lot in lots:
            acquiredTrade = Trade(ID=lot.Acquired.ID, Quantity=lot.Acquired.ExchangedMoney.UnderlyingQuantity, Date=lot.Acquired.Date)
            soldTrade = Trade(ID=lot.Sold.ID, Quantity=lot.Sold.ExchangedMoney.UnderlyingQuantity, Date=lot.Sold.Date)

            acquired = LotAcquired(Date=acquiredTrade.Date, Relation=acquiredTrade)
            sold = LotSold(Date=soldTrade.Date, Relation=soldTrade)
            processedLot = Lot(Quantity=lot.Quantity, Acquired=acquired, Sold=sold)
            processedLots.append(processedLot)

        return processedLots

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
