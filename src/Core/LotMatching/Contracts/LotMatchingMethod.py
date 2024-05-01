from abc import ABC, abstractmethod
from typing import Sequence

from Core.LotMatching.Schemas.Lot import Lot
from Core.LotMatching.Schemas.Trade import Trade
from Core.LotMatching.Services.TradeAssociationTracker import (
    TradeAssociationTracker,
)


class LotMatchingMethod(ABC):
    def __init__(self) -> None:
        super().__init__()
        self.tradeAssociationTracker: TradeAssociationTracker = TradeAssociationTracker()

    @abstractmethod
    def performMatching(self, events: Sequence[Trade]) -> Sequence[Lot]:
        """
        Please note that the Lot Matcher assumes Trade Events of the same Asset Class and Log/Short position.
        It's up to the caller to guarantee this.
        """

    @abstractmethod
    def generateTradesFromLotsWithTracking(self, lots: Sequence[Lot]) -> Sequence[Trade]:
        """
        It is required that the performMatching method is called before this one, as doing so populates
        an internal tracking structure, which is used for generating appropriate trade events here.
        """
