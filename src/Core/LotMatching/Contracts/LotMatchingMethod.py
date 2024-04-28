from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Sequence

from Core.LotMatching.Services.TradeAssociationTracker import TradeAssociationTracker
from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Schemas.Lot import Lot


class LotMatchingMethod(ABC):
    tradeAssociationTracker: TradeAssociationTracker = TradeAssociationTracker()

    @abstractmethod
    def performMatching(self, events: Sequence[GenericTradeEvent]) -> Sequence[Lot]:
        """
        Please note that the Lot Matcher assumes Trade Events of the same Asset Class and Log/Short position.
        It's up to the caller to guarantee this.
        """
