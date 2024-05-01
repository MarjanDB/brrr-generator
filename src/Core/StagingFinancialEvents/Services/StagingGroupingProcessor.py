from typing import Sequence

import Core.FinancialEvents.Contracts.EventProcessor as ep
import Core.FinancialEvents.EventProcessors.DerivativeEventProcessor as dep
import Core.FinancialEvents.EventProcessors.StockEventProcessor as sep
import Core.FinancialEvents.LotProcessors.DerivativeLotProcessor as dlp
import Core.FinancialEvents.LotProcessors.StockLotProcessor as slp
import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import Core.FinancialEvents.Utils.ProcessingUtils as pu
from Core.FinancialEvents.EventProcessors.CashTransactionEventProcessor import (
    CashTransactionEventProcessor,
)
from StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping


class StagingGroupingProcessor(ep.EventProcessor[StagingFinancialGrouping, pgf.UnderlyingGrouping]):
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
