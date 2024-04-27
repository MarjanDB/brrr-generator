from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod


class LotMatcher:

    def match(self, method: LotMatchingMethod, events: GenericTradeEvent): ...
