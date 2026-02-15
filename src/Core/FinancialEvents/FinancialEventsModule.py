from opyoid.bindings.module import Module

from Core.FinancialEvents.Services.ApplyIdentifierRelationshipsService import (
    ApplyIdentifierRelationshipsService,
)
from Core.FinancialEvents.Services.FinancialEventsProcessor import (
    FinancialEventsProcessor,
)
from Core.FinancialEvents.Utils.ProcessingUtils import ProcessingUtils


class FinancialEventsModule(Module):
    def configure(self) -> None:
        self.bind(ApplyIdentifierRelationshipsService)
        self.bind(FinancialEventsProcessor)
        self.bind(ProcessingUtils)
