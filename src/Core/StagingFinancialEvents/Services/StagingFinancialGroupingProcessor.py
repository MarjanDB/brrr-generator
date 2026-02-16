from typing import Sequence

import arrow

import Core.FinancialEvents.Schemas.Events as pe
import Core.FinancialEvents.Schemas.FinancialEvents as pfe
import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Schemas.IdentifierRelationship import (
    IdentifierChangeType,
    IdentifierRelationship,
    IdentifierRelationshipSplit,
)
from Core.StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping
from Core.StagingFinancialEvents.Schemas.IdentifierRelationship import (
    StagingIdentifierChangeType,
    StagingIdentifierRelationshipSplit,
)
from Core.StagingFinancialEvents.Schemas.Lots import StagingTaxLot
from Core.StagingFinancialEvents.Schemas.StagingFinancialEvents import (
    StagingFinancialEvents,
)
from Core.StagingFinancialEvents.Services.IdentifierRelationshipResolution import (
    IdentifierRelationshipResolution,
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


class StagingFinancialGroupingProcessor:
    def __init__(self, utils: ProcessingUtils) -> None:
        self.stockProcessor = StockEventProcessor(utils)
        self.derivativeProcessor = DerivativeEventProcessor(utils)
        self.stockLotProcessor = StockLotProcessor(utils)
        self.derivativeLotProcessor = DerivativeLotProcessor(utils)
        self.cashTransactionProcessor = CashTransactionEventProcessor(utils)
        self.identifierRelationshipResolution = IdentifierRelationshipResolution()

    def _processAndGroupDerivativeTrades(self, input: StagingFinancialGrouping) -> Sequence[pgf.DerivativeGrouping]:
        derivativeTrades = input.DerivativeTrades
        processedDerivatives = list(map(self.derivativeProcessor.process, derivativeTrades))
        derivativeCausedByCorporateActions = list(self.derivativeProcessor.createMissingDerivativeTradesFromCorporateActions())
        allDerivativeTrades = processedDerivatives + derivativeCausedByCorporateActions

        derivateTaxLots = input.DerivativeTaxLots

        dictOfDerivativeTradesByFinancialIdentifier: dict[pgf.FinancialIdentifier, list[pe.TradeEventDerivative]] = dict()
        dictOfDerivativeTaxLotsByFinancialIdentifier: dict[pgf.FinancialIdentifier, list[StagingTaxLot]] = dict()

        for trade in allDerivativeTrades:
            recordedTrades = dictOfDerivativeTradesByFinancialIdentifier.get(trade.FinancialIdentifier, [])
            recordedTrades.append(trade)
            dictOfDerivativeTradesByFinancialIdentifier[trade.FinancialIdentifier] = recordedTrades

        for lot in derivateTaxLots:
            recordedLots = dictOfDerivativeTaxLotsByFinancialIdentifier.get(
                pgf.FinancialIdentifier.fromStagingIdentifier(lot.FinancialIdentifier), []
            )
            recordedLots.append(lot)
            dictOfDerivativeTaxLotsByFinancialIdentifier[pgf.FinancialIdentifier.fromStagingIdentifier(lot.FinancialIdentifier)] = (
                recordedLots
            )

        derivativeGroupings: list[pgf.DerivativeGrouping] = []

        for financialIdentifier in dictOfDerivativeTradesByFinancialIdentifier.keys():
            trades = dictOfDerivativeTradesByFinancialIdentifier.get(financialIdentifier, [])
            taxLots = dictOfDerivativeTaxLotsByFinancialIdentifier.get(financialIdentifier, [])

            processedDerivativeLots = list(
                map(
                    lambda lot: self.derivativeLotProcessor.process(lot, trades),
                    taxLots,
                )
            )

            derivativeGroupings.append(
                pgf.DerivativeGrouping(
                    FinancialIdentifier=financialIdentifier,
                    DerivativeTrades=trades,
                    DerivativeTaxLots=processedDerivativeLots,
                )
            )

        return derivativeGroupings

    def process(self, input: StagingFinancialGrouping) -> pgf.FinancialGrouping:
        stockTrades = input.StockTrades
        processedTrades = list(map(self.stockProcessor.process, stockTrades))
        tradesCausedByCorporateActions = list(self.stockProcessor.createMissingStockTradesFromCorporateActions())

        allTrades = processedTrades + tradesCausedByCorporateActions

        stockLots = input.StockTaxLots
        processedStockLots = list(map(lambda lot: self.stockLotProcessor.process(lot, allTrades), stockLots))

        derivativeGroupings = self._processAndGroupDerivativeTrades(input)

        cashTransactions = input.CashTransactions
        processedCashTransactions = list(map(self.cashTransactionProcessor.process, cashTransactions))

        processed = pgf.FinancialGrouping(
            FinancialIdentifier=pgf.FinancialIdentifier.fromStagingIdentifier(input.FinancialIdentifier),
            CountryOfOrigin=input.CountryOfOrigin,
            UnderlyingCategory=input.UnderlyingCategory,
            StockTrades=allTrades,
            StockTaxLots=processedStockLots,
            DerivativeGroupings=derivativeGroupings,
            CashTransactions=processedCashTransactions,
        )
        return processed

    def generateGenericGroupings(self, groupings: Sequence[StagingFinancialGrouping]) -> Sequence[pgf.FinancialGrouping]:
        processedGroupings = list(map(self.process, groupings))
        return processedGroupings

    def processStagingFinancialEvents(self, events: StagingFinancialEvents) -> pfe.FinancialEvents:
        """Resolve partial identifier relationships (merge by CorrelationKey), then process groupings and convert to core FinancialEvents."""
        resolved = self.identifierRelationshipResolution.resolveStagingFinancialEventsPartialRelationships(events)
        processedGroupings = self.generateGenericGroupings(resolved.Groupings)

        coreRels: list[IdentifierRelationship] = []
        for r in resolved.IdentifierRelationships.Relationships:
            if r.ChangeType == StagingIdentifierChangeType.UNKNOWN:
                continue
            effective_date = r.EffectiveDate if r.EffectiveDate is not None else arrow.get(1970, 1, 1)
            from_id = pgf.FinancialIdentifier.fromStagingIdentifier(r.FromIdentifier)
            to_id = pgf.FinancialIdentifier.fromStagingIdentifier(r.ToIdentifier)
            change_type = IdentifierChangeType[r.ChangeType.name]
            if isinstance(r, StagingIdentifierRelationshipSplit):
                coreRels.append(
                    IdentifierRelationshipSplit(
                        FromIdentifier=from_id,
                        ToIdentifier=to_id,
                        ChangeType=change_type,
                        EffectiveDate=effective_date,
                        QuantityBefore=r.QuantityBefore,
                        QuantityAfter=r.QuantityAfter,
                    )
                )
            else:
                coreRels.append(
                    IdentifierRelationship(
                        FromIdentifier=from_id,
                        ToIdentifier=to_id,
                        ChangeType=change_type,
                        EffectiveDate=effective_date,
                    )
                )
        return pfe.FinancialEvents(
            Groupings=processedGroupings,
            IdentifierRelationships=coreRels,
        )
