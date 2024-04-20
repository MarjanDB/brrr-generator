from typing import Sequence

import src.Core.FinancialEvents.Processor.Contracts.EventProcessor as ep
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf


class StockEventProcessor(ep.EventProcessor[sgf.GenericTradeEventStaging, pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold]):

    # TODO: Create trade events based on corporate events
    def createMissingDerivativeTradesFromCorporateActions(
        self,
    ) -> Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold]:
        return []

    def process(self, input: sgf.GenericTradeEventStaging) -> pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold:
        if isinstance(input, pgf.TradeEventDerivativeAcquired):
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
