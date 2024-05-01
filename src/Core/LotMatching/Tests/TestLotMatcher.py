from typing import Sequence
from unittest.mock import MagicMock

from arrow import get

from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Schemas.Lot import Lot
from Core.LotMatching.Schemas.Trade import Trade
from Core.LotMatching.Services.LotMatcher import LotMatcher


class FakeLotMatchingMethod(LotMatchingMethod):
    def performMatching(self, events: Sequence[Trade]) -> Sequence[Lot]:
        return []

    def generateTradesFromLotsWithTracking(self, lots: Sequence[Lot]) -> Sequence[Trade]:
        return []


class TestLotMatcher:
    def testProvidedMethodIsCalled(self):
        fakeMethod = FakeLotMatchingMethod()
        fakeMethod.performMatching = MagicMock()
        fakeMethod.generateTradesFromLotsWithTracking = MagicMock()

        lotMatcher = LotMatcher()
        lotMatcher.matchLotsWithTrades(
            fakeMethod,
            [Trade(ID="ID", Quantity=1, Date=get("2023-01-01"))],
        )

        fakeMethod.performMatching.assert_called()  # As soon as there's a single trade event, the lot matcher should be called
        fakeMethod.generateTradesFromLotsWithTracking.assert_called()  # As soon as there's a single trade event, the lot matcher should be called
