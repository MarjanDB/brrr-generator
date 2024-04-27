from typing import Sequence

from Core.FinancialEvents.Schemas.StagingGenericFormats import GenericTaxLotEventStaging
from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import GenericTradeEvent
from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from src.Core.LotMatching.Schemas.Lot import Lot


class ProvidedLotMatchingMethod(LotMatchingMethod):
    predefinedLots: Sequence[GenericTaxLotEventStaging]

    def __init__(self, predefinedLots: Sequence[GenericTaxLotEventStaging]) -> None:
        super().__init__()
        self.predefinedLots = predefinedLots

    def performMatching(self, events: Sequence[GenericTradeEvent]) -> Sequence[Lot]:

        return []
