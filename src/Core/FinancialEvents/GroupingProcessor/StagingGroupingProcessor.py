from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar

import src.Core.FinancialEvents.EventProcessors.DerivativeEventProcessor as dep
import src.Core.FinancialEvents.EventProcessors.StockEventProcessor as sep
import src.Core.FinancialEvents.LotProcessors.DerivativeLotProcessor as dlp
import src.Core.FinancialEvents.LotProcessors.StockLotProcessor as slp
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf
import src.Core.FinancialEvents.Utils.ProcessingUtils as pu

TRADE_EVENT_TYPE = TypeVar("TRADE_EVENT_TYPE")


class StagingGroupingProcessor:
    stockProcessor: sep.StockEventProcessor
    derivativeProcessor: dep.DerivativeEventProcessor

    stockLotProcessor: slp.StockLotProcessor
    derivativeLotProcessor: dlp.DerivativeLotProcessor

    def __init__(self) -> None:
        utils = pu.ProcessingUtils()
        self.stockProcessor = sep.StockEventProcessor(utils)
        self.derivativeProcessor = dep.DerivativeEventProcessor(utils)
        self.stockLotProcessor = slp.StockLotProcessor(utils)
        self.derivativeLotProcessor = dlp.DerivativeLotProcessor(utils)

    def processGenericGrouping(self, grouping: sgf.GenericUnderlyingGroupingStaging) -> pgf.UnderlyingGrouping:
        stockTrades = grouping.StockTrades
        processedTrades = list(map(self.stockProcessor.process, stockTrades))
        tradesCausedByCorporateActions = list(self.stockProcessor.createMissingStockTradesFromCorporateActions())

        allTrades = processedTrades + tradesCausedByCorporateActions

        stockLots = grouping.StockTaxLots
        processedStockLots = list(map(lambda lot: self.stockLotProcessor.process(lot, allTrades), stockLots))

        derivativeTrades = grouping.DerivativeTrades
        processedDerivatives = list(map(self.derivativeProcessor.process, derivativeTrades))
        derivativeCausedByCorporateActions = list(self.derivativeProcessor.createMissingDerivativeTradesFromCorporateActions())
        allDerivativeTrades = processedDerivatives + derivativeCausedByCorporateActions

        derivativeLots = grouping.DerivativeTaxLots
        porcessedDerivativeLots = list(
            map(
                lambda lot: self.derivativeLotProcessor.process(lot, allDerivativeTrades),
                derivativeLots,
            )
        )

        processed = pgf.UnderlyingGrouping(
            ISIN=grouping.ISIN,
            CountryOfOrigin=grouping.CountryOfOrigin,
            UnderlyingCategory=grouping.UnderlyingCategory,
            StockTrades=allTrades,
            StockTaxLots=processedStockLots,
            DerivativeTrades=allDerivativeTrades,
            DerivativeTaxLots=porcessedDerivativeLots,
            Dividends=[],
        )
        return processed

    def generateGenericGroupings(self, groupings: Sequence[sgf.GenericUnderlyingGroupingStaging]) -> Sequence[pgf.UnderlyingGrouping]:
        processedGroupings = list(map(self.processGenericGrouping, groupings))
        return processedGroupings
