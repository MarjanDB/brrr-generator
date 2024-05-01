from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from Core.StagingFinancialEvents.Utils.ProcessingUtils import ProcessingUtils

INPUT_TYPE = TypeVar("INPUT_TYPE")
OUTPUT_TYPE = TypeVar("OUTPUT_TYPE")


class EventProcessor(ABC, Generic[INPUT_TYPE, OUTPUT_TYPE]):
    def __init__(self, utils: ProcessingUtils):
        self.utils = utils

    @abstractmethod
    def process(self, input: INPUT_TYPE) -> OUTPUT_TYPE: ...
