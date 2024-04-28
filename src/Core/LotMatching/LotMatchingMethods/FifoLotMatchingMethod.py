from typing import Sequence

from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from src.Core.LotMatching.Schemas.Lot import Lot
from src.Core.LotMatching.Schemas.Trade import Trade


class FifoLotMatchingMethod(LotMatchingMethod):

    def performMatching(self, events: Sequence[Trade]) -> Sequence[Lot]:

        return []
