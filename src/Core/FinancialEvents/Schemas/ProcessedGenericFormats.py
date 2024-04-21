from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar, Union

from arrow import Arrow

import src.Core.FinancialEvents.Schemas.CommonFormats as cf


@dataclass
class GenericTransactionCash:
    AccountID: str
    ReceivedDateTime: Arrow
    ActionID: str
    TransactionID: str
    ExchangedMoney: cf.GenericMonetaryExchangeInformation


@dataclass
class TransactionCashDividend(GenericTransactionCash):
    SecurityISIN: str
    ListingExchange: str
    DividendType: cf.GenericDividendType


@dataclass
class TransactionCashWitholdingTax(GenericTransactionCash):
    SecurityISIN: str
    ListingExchange: str


TransactionCash = Union[TransactionCashDividend, TransactionCashWitholdingTax]


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
    AcquiredReason: cf.GenericDerivativeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventDerivativeSold(GenericTradeEvent):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


TradeEventDerivatives = Union[TradeEventDerivativeAcquired, TradeEventDerivativeSold]


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

    CashTransactions: Sequence[TransactionCash]


@dataclass
class UnderlyingGroupingWithTradesOfInterest:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: cf.GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]

    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]

    CashTransactions: Sequence[TransactionCash]


@dataclass
class GenericDerivativeReportItemSecurityLineBought:
    AcquiredDate: Arrow
    AcquiredHow: cf.GenericDerivativeReportItemGainType
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
    InventoryListType: cf.GenericDerivativeReportItemType
    AssetClass: cf.GenericDerivativeReportAssetClassType
    ISIN: str
    Ticker: str
    HasForeignTax: bool
    ForeignTax: float | None
    ForeignTaxCountryID: str | None
    ForeignTaxCountryName: str | None

    Lines: list[GenericDerivativeReportItemSecurityLineBought | GenericDerivativeReportItemSecurityLineSold]
