from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod


class FifoLotMatchingMethod(LotMatchingMethod):

    def performMatching(self, events: GenericTradeEvent): ...
