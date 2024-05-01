from abc import ABC, abstractmethod
from typing import Generic, TypeVar

import Core.FinancialEvents.Utils.ProcessingUtils as pu
from Core.LotMatching.Services.LotMatcher import LotMatcher

INPUT_TYPE = TypeVar("INPUT_TYPE")
OUTPUT_TYPE = TypeVar("OUTPUT_TYPE")


class GroupingProcessor(ABC, Generic[INPUT_TYPE, OUTPUT_TYPE]):
    def __init__(self, utils: pu.ProcessingUtils, lotMatcher: LotMatcher):
        self.utils = utils
        self.lotMatcher = lotMatcher

    @abstractmethod
    def process(self, input: INPUT_TYPE) -> OUTPUT_TYPE: ...
