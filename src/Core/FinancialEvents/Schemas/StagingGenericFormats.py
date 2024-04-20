from dataclasses import dataclass
from typing import Sequence

from arrow import Arrow

import src.Core.FinancialEvents.Schemas.CommonFormats as cf


@dataclass
class GenericDividendLine:
    AccountID: str
    ExchangedMoney: cf.GenericMonetaryExchangeInformation
    ReceivedDateTime: Arrow
    DividendActionID: str
    SecurityISIN: str
    ListingExchange: str
    DividendType: cf.GenericDividendType
    LineType: cf.GenericDividendLineType


@dataclass
class GenericTradeEventStaging:
    ID: str
    ISIN: str
    Ticker: str | None
    AssetClass: cf.GenericAssetClass  # Trades can have to do with different Asset Classes (Stock, Options, ...)
    Date: Arrow
    Multiplier: float  # for Leveraged trades
    ExchangedMoney: cf.GenericMonetaryExchangeInformation


@dataclass
class TradeEventStagingStockAcquired(GenericTradeEventStaging):
    AcquiredReason: cf.GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventStagingStockSold(GenericTradeEventStaging):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


@dataclass
class TradeEventStagingDerivativeAcquired(GenericTradeEventStaging):
    AcquiredReason: cf.GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventStagingDerivativeSold(GenericTradeEventStaging):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


@dataclass
class GenericTaxLotMatchingDetails:
    ID: str | None
    DateTime: Arrow | None


@dataclass
class GenericTaxLotEventStaging:
    ID: str
    ISIN: str
    Ticker: str | None
    Quantity: float
    Acquired: GenericTaxLotMatchingDetails
    Sold: GenericTaxLotMatchingDetails
    ShortLongType: cf.GenericShortLong  # Some trades can be SHORTING, meaning you first sell and then buy back


@dataclass
class GenericUnderlyingGroupingStaging:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: cf.GenericCategory

    StockTrades: Sequence[TradeEventStagingStockAcquired | TradeEventStagingStockSold]
    StockTaxLots: Sequence[GenericTaxLotEventStaging]

    DerivativeTrades: Sequence[TradeEventStagingDerivativeAcquired | TradeEventStagingDerivativeSold]
    DerivativeTaxLots: Sequence[GenericTaxLotEventStaging]

    Dividends: Sequence[GenericDividendLine]
