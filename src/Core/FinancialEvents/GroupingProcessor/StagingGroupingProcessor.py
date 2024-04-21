from typing import Sequence

import src.Core.FinancialEvents.Contracts.EventProcessor as ep
import src.Core.FinancialEvents.EventProcessors.DerivativeEventProcessor as dep
import src.Core.FinancialEvents.EventProcessors.StockEventProcessor as sep
import src.Core.FinancialEvents.LotProcessors.DerivativeLotProcessor as dlp
import src.Core.FinancialEvents.LotProcessors.StockLotProcessor as slp
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf
import src.Core.FinancialEvents.Utils.ProcessingUtils as pu
from src.Core.FinancialEvents.EventProcessors.CashTransactionEventProcessor import (
    CashTransactionEventProcessor,
)


class StagingGroupingProcessor(ep.EventProcessor[sgf.GenericUnderlyingGroupingStaging, pgf.UnderlyingGrouping]):
    stockProcessor: sep.StockEventProcessor
    derivativeProcessor: dep.DerivativeEventProcessor

    stockLotProcessor: slp.StockLotProcessor
    derivativeLotProcessor: dlp.DerivativeLotProcessor
    cashTransactionProcessor: CashTransactionEventProcessor

    def __init__(self, utils: pu.ProcessingUtils) -> None:
        self.stockProcessor = sep.StockEventProcessor(utils)
        self.derivativeProcessor = dep.DerivativeEventProcessor(utils)
        self.stockLotProcessor = slp.StockLotProcessor(utils)
        self.derivativeLotProcessor = dlp.DerivativeLotProcessor(utils)
        self.cashTransactionProcessor = CashTransactionEventProcessor(utils)

    def process(self, input: sgf.GenericUnderlyingGroupingStaging) -> pgf.UnderlyingGrouping:
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

    def generateGenericGroupings(self, groupings: Sequence[sgf.GenericUnderlyingGroupingStaging]) -> Sequence[pgf.UnderlyingGrouping]:
        processedGroupings = list(map(self.process, groupings))
        return processedGroupings
