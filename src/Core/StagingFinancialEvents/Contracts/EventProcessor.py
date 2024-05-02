from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from Core.FinancialEvents.Schemas.Events import TradeEvent
from Core.StagingFinancialEvents.Schemas.Events import StagingTradeEvent
from Core.StagingFinancialEvents.Utils.ProcessingUtils import ProcessingUtils

INPUT_TYPE = TypeVar("INPUT_TYPE", bound=StagingTradeEvent)
OUTPUT_TYPE = TypeVar("OUTPUT_TYPE", bound=TradeEvent, covariant=True)


class EventProcessor(ABC, Generic[INPUT_TYPE, OUTPUT_TYPE]):
    def __init__(self, utils: ProcessingUtils):
        self.utils = utils

    @abstractmethod
    def process(self, input: INPUT_TYPE) -> OUTPUT_TYPE: ...
