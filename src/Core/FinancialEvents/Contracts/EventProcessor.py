from abc import ABC, abstractmethod
from typing import Generic, TypeVar

import Core.FinancialEvents.Utils.ProcessingUtils as pu

INPUT_TYPE = TypeVar("INPUT_TYPE")
OUTPUT_TYPE = TypeVar("OUTPUT_TYPE")


class EventProcessor(ABC, Generic[INPUT_TYPE, OUTPUT_TYPE]):
    utils: pu.ProcessingUtils

    def __init__(self, utils: pu.ProcessingUtils):
        self.utils = utils

    @abstractmethod
    def process(self, input: INPUT_TYPE) -> OUTPUT_TYPE: ...
