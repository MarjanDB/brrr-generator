from typing import Sequence

import Core.FinancialEvents.Contracts.EventProcessor as ep
import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
from StagingFinancialEvents.Schemas.Events import (
    StagingTradeEvent,
    StagingTradeEventStockAcquired,
)


class StockEventProcessor(ep.EventProcessor[StagingTradeEvent, pgf.TradeEventStockAcquired | pgf.TradeEventStockSold]):

    # TODO: Create trade events based on corporate events
    def createMissingStockTradesFromCorporateActions(
        self,
    ) -> Sequence[pgf.TradeEventStockAcquired | pgf.TradeEventStockSold]:
        return []

    def process(self, input: StagingTradeEvent) -> pgf.TradeEventStockAcquired | pgf.TradeEventStockSold:
        if isinstance(input, StagingTradeEventStockAcquired):
            converted = pgf.TradeEventStockAcquired(
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

        converted = pgf.TradeEventStockSold(
            ID=input.ID,
            ISIN=input.ISIN,
            Ticker=input.Ticker or "",
            AssetClass=input.AssetClass,
            Date=input.Date,
            Multiplier=input.Multiplier,
            ExchangedMoney=input.ExchangedMoney,
        )
        return converted
