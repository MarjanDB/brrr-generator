from typing import Sequence
from unittest.mock import MagicMock

from arrow import get

from src.Core.FinancialEvents.Schemas.CommonFormats import (
    GenericAssetClass,
    GenericMonetaryExchangeInformation,
)
from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from src.Core.LotMatching.Schemas.Lot import Lot
from src.Core.LotMatching.Services.LotMatcher import LotMatcher


class FakeLotMatchingMethod(LotMatchingMethod):
    def performMatching(self, events: Sequence[GenericTradeEvent]) -> Sequence[Lot]:
        return []


class TestLotMatcher:
    def testProvidedMethodIsCalled(self):
        fakeMethod = FakeLotMatchingMethod()
        fakeMethod.performMatching = MagicMock()

        lotMatcher = LotMatcher()
        lotMatcher.match(
            fakeMethod,
            [
                GenericTradeEvent(
                    ID="test",
                    ISIN="test",
                    Ticker="test",
                    AssetClass=GenericAssetClass.STOCK,
                    Date=get("2023-01-01"),
                    Multiplier=1,
                    ExchangedMoney=GenericMonetaryExchangeInformation(
                        UnderlyingCurrency="EUR",
                        UnderlyingQuantity=1,
                        UnderlyingTradePrice=1,
                        ComissionCurrency="EUR",
                        ComissionTotal=0,
                        TaxCurrency="EUR",
                        TaxTotal=0,
                    ),
                )
            ],
        )

        fakeMethod.performMatching.assert_called()  # As soon as there's a single trade event, the lot matcher should be called
