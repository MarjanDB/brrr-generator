from opyoid.bindings.module import Module

from Core.FinancialEvents.EventProcessors.CashTransactionEventProcessor import (
    CashTransactionEventProcessor,
)
from Core.FinancialEvents.EventProcessors.DerivativeEventProcessor import (
    DerivativeEventProcessor,
)
from Core.FinancialEvents.EventProcessors.StockEventProcessor import (
    StockEventProcessor,
)
from Core.FinancialEvents.GroupingProcessor.CountedGroupingProcessor import (
    CountedGroupingProcessor,
)
from Core.FinancialEvents.LotProcessors.DerivativeLotProcessor import (
    DerivativeLotProcessor,
)
from Core.FinancialEvents.LotProcessors.StockLotProcessor import StockLotProcessor
from Core.FinancialEvents.Utils.ProcessingUtils import ProcessingUtils
from StagingFinancialEvents.Services.StagingGroupingProcessor import (
    StagingGroupingProcessor,
)


class FinancialEventsModule(Module):
    def configure(self) -> None:
        self.bind(DerivativeEventProcessor)
        self.bind(StockEventProcessor)
        self.bind(StockLotProcessor)
        self.bind(DerivativeLotProcessor)
        self.bind(CountedGroupingProcessor)
        self.bind(StagingGroupingProcessor)
        self.bind(ProcessingUtils)
        self.bind(CashTransactionEventProcessor)
