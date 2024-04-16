from dataclasses import dataclass
from enum import Enum
from typing import Generic, Sequence, TypeVar

from arrow import Arrow

import src.Core.Schemas.CommonFormats as cf
import src.Core.Schemas.StagingGenericFormats as sgf


@dataclass
class GenericTradeEvent:
    ID: str
    ISIN: str
    Ticker: str
    AssetClass: cf.GenericAssetClass  # Trades can have to do with different Asset Classes (Stock, Options, ...)
    Date: Arrow
    Multiplier: float  # for Leveraged trades
    ExchangedMoney: cf.GenericMonetaryExchangeInformation


@dataclass
class TradeEventStockAcquired(GenericTradeEvent):
    AcquiredReason: cf.GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventStockSold(GenericTradeEvent):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


@dataclass
class TradeEventDerivativeAcquired(GenericTradeEvent):
    AcquiredReason: cf.GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventDerivativeSold(GenericTradeEvent):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


GenericTaxLotAcquiredEvent = TypeVar("GenericTaxLotAcquiredEvent")
GenericTaxLotSoldEvent = TypeVar("GenericTaxLotSoldEvent")


@dataclass
class GenericTaxLot(Generic[GenericTaxLotAcquiredEvent, GenericTaxLotSoldEvent]):
    ID: str
    ISIN: str
    Quantity: float
    Acquired: GenericTaxLotAcquiredEvent
    Sold: GenericTaxLotSoldEvent
    ShortLongType: cf.GenericShortLong  # Some trades can be SHORTING, meaning you first sell and then buy back


@dataclass
class TradeTaxLotEventStock(GenericTaxLot[TradeEventStockAcquired, TradeEventStockSold]): ...


@dataclass
class TradeTaxLotEventDerivative(GenericTaxLot[TradeEventDerivativeAcquired, TradeEventDerivativeSold]): ...


@dataclass
class UnderlyingGrouping:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: cf.GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]
    StockTaxLots: Sequence[TradeTaxLotEventStock]

    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]
    DerivativeTaxLots: Sequence[TradeTaxLotEventDerivative]

    Dividends: Sequence[sgf.GenericDividendLine]


@dataclass
class UnderlyingGroupingWithTradesOfInterest:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: cf.GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]

    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]

    Dividends: Sequence[sgf.GenericDividendLine]


class GenericDerivativeReportItemType(str, Enum):
    DERIVATIVE = "DERIVATIVE"
    DERIVATIVE_SHORT = "DERIVATIVE_SHORT"


class GenericDerivativeReportAssetClassType(str, Enum):
    FUTURES_CONTRACT = "FUTURES_CONTRACT"  # https://www.investopedia.com/terms/f/futurescontract.asp
    CONTRACT_FOR_DIFFERENCE = "CFD"  # https://www.investopedia.com/terms/c/contractfordifferences.asp
    OPTION = "OPTION"
    CERTIFICATE = "CERTIFICATE"
    OTHER = "OTHER"


class GenericDerivativeReportItemGainType(str, Enum):
    CAPITAL_INVESTMENT = "CAPITAL_INVESTMENT"  # guessing
    BOUGHT = "BOUGHT"
    CAPITAL_RAISE = "CAPITAL_RAISE"  # guessing
    CAPITAL_ASSET = "CAPITAL_ASSET"  # guessing
    CAPITALIZATION_CHANGE = "CAPITALIZATION_CHANGE"  # guessing
    INHERITENCE = "INHERITENCE"
    GIFT = "GIFT"
    OTHER = "OTHER"


@dataclass
class GenericDerivativeReportItemSecurityLineBought:
    AcquiredDate: Arrow
    AcquiredHow: GenericDerivativeReportItemGainType
    NumberOfUnits: float
    AmountPerUnit: float
    TotalAmountPaid: float  # to avoid rounding errors in case of % purchases
    TaxPaidForPurchase: float
    Leveraged: bool
    TransactionID: str


@dataclass
class GenericDerivativeReportItemSecurityLineSold:
    SoldDate: Arrow
    NumberOfUnitsSold: float
    AmountPerUnit: float
    TotalAmountSoldFor: float
    TransactionID: str
    Leveraged: bool
    WashSale: bool  # no trades 30 days before and after, and sold for loss
    SoldForProfit: bool


@dataclass
class GenericDerivativeReportLotMatches:
    TransactionID: str
    Quantitiy: float
    LotOriginalBuy: GenericDerivativeReportItemSecurityLineBought
    LotOriginalSell: GenericDerivativeReportItemSecurityLineSold


@dataclass
class GenericDerivativeReportItem:
    InventoryListType: GenericDerivativeReportItemType
    AssetClass: GenericDerivativeReportAssetClassType
    ISIN: str
    Ticker: str
    HasForeignTax: bool
    ForeignTax: float | None
    ForeignTaxCountryID: str | None
    ForeignTaxCountryName: str | None

    Lines: list[GenericDerivativeReportItemSecurityLineBought | GenericDerivativeReportItemSecurityLineSold]
