from typing import Sequence

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod


class LotMatcher:

    def match(self, method: LotMatchingMethod, events: Sequence[GenericTradeEvent]):
        method.performMatching(events[0])
