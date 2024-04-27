from abc import ABC, abstractmethod

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent


class LotMatchingMethod(ABC):

    @abstractmethod
    def performMatching(self, events: GenericTradeEvent): ...
