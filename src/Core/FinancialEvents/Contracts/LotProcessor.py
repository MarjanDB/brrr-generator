from abc import ABC, abstractmethod
from typing import Generic, TypeVar

import Core.FinancialEvents.Utils.ProcessingUtils as pu

INPUT_TYPE = TypeVar("INPUT_TYPE")
OUTPUT_TYPE = TypeVar("OUTPUT_TYPE")
REFERENCE_TYPE = TypeVar("REFERENCE_TYPE")


class LotProcessor(ABC, Generic[INPUT_TYPE, OUTPUT_TYPE, REFERENCE_TYPE]):
    utils: pu.ProcessingUtils

    def __init__(self, utils: pu.ProcessingUtils):
        self.utils = utils

    @abstractmethod
    def process(self, input: INPUT_TYPE, references: REFERENCE_TYPE) -> OUTPUT_TYPE: ...
