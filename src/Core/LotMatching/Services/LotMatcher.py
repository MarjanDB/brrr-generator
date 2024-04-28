from dataclasses import dataclass
from typing import Sequence

from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from src.Core.LotMatching.Schemas.Lot import Lot
from src.Core.LotMatching.Schemas.Trade import Trade


@dataclass
class LotMatchingDetails:
    Lots: Sequence[Lot]
    Trades: Sequence[Trade]


class LotMatcher:

    def matchLotsWithTrades(self, method: LotMatchingMethod, events: Sequence[Trade]) -> LotMatchingDetails:
        lots = method.performMatching(events)

        trades = method.generateTradesFromLotsWithTracking(lots)

        details = LotMatchingDetails(Lots=lots, Trades=trades)

        return details
