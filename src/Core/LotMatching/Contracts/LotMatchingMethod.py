from abc import ABC, abstractmethod
from typing import Sequence

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Schemas.Lot import Lot


class LotMatchingMethod(ABC):

    @abstractmethod
    def performMatching(self, events: Sequence[GenericTradeEvent]) -> Sequence[Lot]: ...
