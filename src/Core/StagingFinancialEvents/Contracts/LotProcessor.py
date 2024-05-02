from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from Core.FinancialEvents.Schemas.Events import TradeEvent
from Core.FinancialEvents.Schemas.Lots import TaxLot
from Core.StagingFinancialEvents.Schemas.Lots import StagingTaxLot
from Core.StagingFinancialEvents.Utils.ProcessingUtils import ProcessingUtils

INPUT_TYPE = TypeVar("INPUT_TYPE", bound=StagingTaxLot)
OUTPUT_TYPE = TypeVar("OUTPUT_TYPE", bound=TaxLot[TradeEvent, TradeEvent], covariant=True)
REFERENCE_TYPE = TypeVar("REFERENCE_TYPE", bound=TradeEvent)


class LotProcessor(ABC, Generic[INPUT_TYPE, OUTPUT_TYPE, REFERENCE_TYPE]):

    def __init__(self, utils: ProcessingUtils):
        self.utils = utils

    @abstractmethod
    def process(self, input: INPUT_TYPE, references: REFERENCE_TYPE) -> OUTPUT_TYPE: ...
