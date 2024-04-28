from typing import Sequence

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import (
    GenericTaxLot,
    GenericTradeEvent,
)
from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from src.Core.LotMatching.Schemas.Lot import Lot, LotAcquired, LotSold
from src.Core.LotMatching.Schemas.Trade import Trade


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
