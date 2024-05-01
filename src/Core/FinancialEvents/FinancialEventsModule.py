from opyoid.bindings.module import Module

from src.Core.FinancialEvents.EventProcessors.CashTransactionEventProcessor import (
    CashTransactionEventProcessor,
)
from src.Core.FinancialEvents.EventProcessors.DerivativeEventProcessor import (
    DerivativeEventProcessor,
)
from src.Core.FinancialEvents.EventProcessors.StockEventProcessor import (
    StockEventProcessor,
)
from src.Core.FinancialEvents.GroupingProcessor.CountedGroupingProcessor import (
    CountedGroupingProcessor,
)
from src.Core.FinancialEvents.LotProcessors.DerivativeLotProcessor import (
    DerivativeLotProcessor,
)
from src.Core.FinancialEvents.LotProcessors.StockLotProcessor import StockLotProcessor
from src.Core.FinancialEvents.Utils.ProcessingUtils import ProcessingUtils
from src.StagingFinancialEvents.Services.StagingGroupingProcessor import (
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
