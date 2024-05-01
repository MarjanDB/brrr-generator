from typing import Sequence

import Core.FinancialEvents.Contracts.EventProcessor as ep
import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
from StagingFinancialEvents.Schemas.Events import (
    StagingTradeEvent,
    StagingTradeEventDerivativeAcquired,
)


class DerivativeEventProcessor(ep.EventProcessor[StagingTradeEvent, pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold]):

    # TODO: Create trade events based on corporate events
    def createMissingDerivativeTradesFromCorporateActions(
        self,
    ) -> Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold]:
        return []

    def process(self, input: StagingTradeEvent) -> pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold:
        if isinstance(input, StagingTradeEventDerivativeAcquired):
            converted = pgf.TradeEventDerivativeAcquired(
                ID=input.ID,
                ISIN=input.ISIN,
                Ticker=input.Ticker or "",
                AssetClass=input.AssetClass,
                Date=input.Date,
                Multiplier=input.Multiplier,
                AcquiredReason=input.AcquiredReason,
                ExchangedMoney=input.ExchangedMoney,
            )
            return converted

        converted = pgf.TradeEventDerivativeSold(
            ID=input.ID,
            ISIN=input.ISIN,
            Ticker=input.Ticker or "",
            AssetClass=input.AssetClass,
            Date=input.Date,
            Multiplier=input.Multiplier,
            ExchangedMoney=input.ExchangedMoney,
        )
        return converted
