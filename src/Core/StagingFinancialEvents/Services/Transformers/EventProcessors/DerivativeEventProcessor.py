from typing import Sequence

import Core.FinancialEvents.Schemas.FinancialIdentifier as cfi
import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.StagingFinancialEvents.Contracts.EventProcessor import EventProcessor
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEvent,
    StagingTradeEventDerivativeAcquired,
)


class DerivativeEventProcessor(EventProcessor[StagingTradeEvent, pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold]):

    # TODO: Create trade events based on corporate events
    def createMissingDerivativeTradesFromCorporateActions(
        self,
    ) -> Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold]:
        return []

    def process(self, input: StagingTradeEvent) -> pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold:
        converted: pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold

        if isinstance(input, StagingTradeEventDerivativeAcquired):
            converted = pgf.TradeEventDerivativeAcquired(
                ID=input.ID,
                FinancialIdentifier=cfi.FinancialIdentifier.fromStagingIdentifier(input.FinancialIdentifier),
                AssetClass=input.AssetClass,
                Date=input.Date,
                Multiplier=input.Multiplier,
                AcquiredReason=input.AcquiredReason,
                ExchangedMoney=input.ExchangedMoney,
            )
            return converted

        converted = pgf.TradeEventDerivativeSold(
            ID=input.ID,
            FinancialIdentifier=cfi.FinancialIdentifier.fromStagingIdentifier(input.FinancialIdentifier),
            AssetClass=input.AssetClass,
            Date=input.Date,
            Multiplier=input.Multiplier,
            ExchangedMoney=input.ExchangedMoney,
        )
        return converted
