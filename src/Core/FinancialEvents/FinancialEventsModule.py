from opyoid.bindings.module import Module

from Core.FinancialEvents.GroupingProcessor.CountedGroupingProcessor import (
    CountedGroupingProcessor,
)
from Core.FinancialEvents.Utils.ProcessingUtils import ProcessingUtils


class FinancialEventsModule(Module):
    def configure(self) -> None:
        self.bind(CountedGroupingProcessor)
        self.bind(ProcessingUtils)
