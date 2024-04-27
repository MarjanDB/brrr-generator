from typing import Sequence

from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from src.Core.LotMatching.Schemas.Lot import Lot


class FifoLotMatchingMethod(LotMatchingMethod):

    def performMatching(self, events: Sequence[GenericTradeEvent]) -> Sequence[Lot]:

        return []
