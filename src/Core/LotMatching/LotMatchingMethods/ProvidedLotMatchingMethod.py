from src.Core.FinancialEvents.Schemas.ProcessedGenericFormats import (
    GenericTaxLot,
    GenericTradeEvent,
)
from src.Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod


class ProvidedLotMatchingMethod(LotMatchingMethod):
    predefinedLots: GenericTaxLot[GenericTradeEvent, GenericTradeEvent]

    def __init__(self, predefinedLots: GenericTaxLot[GenericTradeEvent, GenericTradeEvent]) -> None:
        super().__init__()
        self.predefinedLots = predefinedLots

    def performMatching(self, events: GenericTradeEvent): ...
