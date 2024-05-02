from typing import Sequence

from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Schemas.Lot import Lot
from Core.LotMatching.Schemas.Trade import Trade


class FifoLotMatchingMethod(LotMatchingMethod):

    def performMatching(self, events: Sequence[Trade]) -> Sequence[Lot]:

        return []
