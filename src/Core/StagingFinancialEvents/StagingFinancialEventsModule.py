from opyoid.bindings.module import Module

from Core.StagingFinancialEvents.Services.StagingGroupingProcessor import (
    StagingGroupingProcessor,
)
from Core.StagingFinancialEvents.Services.Transformers.EventProcessors.CashTransactionEventProcessor import (
    CashTransactionEventProcessor,
)
from Core.StagingFinancialEvents.Services.Transformers.EventProcessors.DerivativeEventProcessor import (
    DerivativeEventProcessor,
)
from Core.StagingFinancialEvents.Services.Transformers.EventProcessors.StockEventProcessor import (
    StockEventProcessor,
)
from Core.StagingFinancialEvents.Services.Transformers.LotProcessors.DerivativeLotProcessor import (
    DerivativeLotProcessor,
)
from Core.StagingFinancialEvents.Services.Transformers.LotProcessors.StockLotProcessor import (
    StockLotProcessor,
)
from Core.StagingFinancialEvents.Utils.ProcessingUtils import ProcessingUtils


class StagingFinancialEventsModule(Module):
    def configure(self) -> None:
        self.bind(ProcessingUtils)
        self.bind(CashTransactionEventProcessor)
        self.bind(DerivativeEventProcessor)
        self.bind(StockEventProcessor)
        self.bind(DerivativeLotProcessor)
        self.bind(StockLotProcessor)
        self.bind(StagingGroupingProcessor)
