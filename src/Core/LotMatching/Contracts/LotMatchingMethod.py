from abc import ABC, abstractmethod
from typing import Sequence

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Schemas.Lot import Lot
from src.Core.LotMatching.Services.TradeAssociationTracker import (
    TradeAssociationTracker,
)


class LotMatchingMethod(ABC):
    tradeAssociationTracker: TradeAssociationTracker = TradeAssociationTracker()

    @abstractmethod
    def performMatching(self, events: Sequence[GenericTradeEvent]) -> Sequence[Lot]:
        """
        Please note that the Lot Matcher assumes Trade Events of the same Asset Class and Log/Short position.
        It's up to the caller to guarantee this.
        """
