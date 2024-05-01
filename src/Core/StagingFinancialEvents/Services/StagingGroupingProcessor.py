from typing import Sequence

import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
from Core.StagingFinancialEvents.Contracts.EventProcessor import EventProcessor
from Core.StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping
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


class StagingGroupingProcessor(EventProcessor[StagingFinancialGrouping, pgf.UnderlyingGrouping]):
    def __init__(self, utils: ProcessingUtils) -> None:
        self.stockProcessor = StockEventProcessor(utils)
        self.derivativeProcessor = DerivativeEventProcessor(utils)
        self.stockLotProcessor = StockLotProcessor(utils)
        self.derivativeLotProcessor = DerivativeLotProcessor(utils)
        self.cashTransactionProcessor = CashTransactionEventProcessor(utils)

    def process(self, input: StagingFinancialGrouping) -> pgf.UnderlyingGrouping:
        stockTrades = input.StockTrades
        processedTrades = list(map(self.stockProcessor.process, stockTrades))
        tradesCausedByCorporateActions = list(self.stockProcessor.createMissingStockTradesFromCorporateActions())

        allTrades = processedTrades + tradesCausedByCorporateActions

        stockLots = input.StockTaxLots
        processedStockLots = list(map(lambda lot: self.stockLotProcessor.process(lot, allTrades), stockLots))

        derivativeTrades = input.DerivativeTrades
        processedDerivatives = list(map(self.derivativeProcessor.process, derivativeTrades))
        derivativeCausedByCorporateActions = list(self.derivativeProcessor.createMissingDerivativeTradesFromCorporateActions())
        allDerivativeTrades = processedDerivatives + derivativeCausedByCorporateActions

        derivativeLots = input.DerivativeTaxLots
        processedDerivativeLots = list(
            map(
                lambda lot: self.derivativeLotProcessor.process(lot, allDerivativeTrades),
                derivativeLots,
            )
        )

        cashTransactions = input.CashTransactions
        processedCashTransactions = list(map(self.cashTransactionProcessor.process, cashTransactions))

        processed = pgf.UnderlyingGrouping(
            ISIN=input.ISIN,
            CountryOfOrigin=input.CountryOfOrigin,
            UnderlyingCategory=input.UnderlyingCategory,
            StockTrades=allTrades,
            StockTaxLots=processedStockLots,
            DerivativeTrades=allDerivativeTrades,
            DerivativeTaxLots=processedDerivativeLots,
            CashTransactions=processedCashTransactions,
        )
        return processed

    def generateGenericGroupings(self, groupings: Sequence[StagingFinancialGrouping]) -> Sequence[pgf.UnderlyingGrouping]:
        processedGroupings = list(map(self.process, groupings))
        return processedGroupings
