from dataclasses import dataclass
from typing import Union

from arrow import Arrow

from Core.FinancialEvents.Schemas.CommonFormats import (
    GenericAssetClass,
    GenericDerivativeReportItemGainType,
    GenericDividendType,
    GenericMonetaryExchangeInformation,
    GenericTradeReportItemGainType,
)
from Core.FinancialEvents.Schemas.FinancialIdentifier import FinancialIdentifier


@dataclass
class TradeEvent:
    ID: str
    FinancialIdentifier: FinancialIdentifier
    AssetClass: GenericAssetClass  # Trades can have to do with different Asset Classes (Stock, Options, ...)
    Date: Arrow
    Multiplier: float  # for Leveraged trades
    ExchangedMoney: GenericMonetaryExchangeInformation


@dataclass
class TradeEventStockAcquired(TradeEvent):
    AcquiredReason: GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventStockSold(TradeEvent):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


TradeEventStock = Union[TradeEventStockAcquired, TradeEventStockSold]


@dataclass
class TradeEventDerivativeAcquired(TradeEvent):
    AcquiredReason: GenericDerivativeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventDerivativeSold(TradeEvent):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


TradeEventDerivative = Union[TradeEventDerivativeAcquired, TradeEventDerivativeSold]


@dataclass
class TradeEventCashTransaction(TradeEvent):
    ActionID: str
    TransactionID: str


@dataclass
class TradeEventCashTransactionDividend(TradeEventCashTransaction):
    ListingExchange: str
    DividendType: GenericDividendType


@dataclass
class TradeEventCashTransactionPaymentInLieuOfDividend(TradeEventCashTransaction):
    ListingExchange: str
    DividendType: GenericDividendType


@dataclass
class TradeEventCashTransactionWitholdingTax(TradeEventCashTransaction):
    ListingExchange: str


@dataclass
class TradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividend(TradeEventCashTransaction):
    ListingExchange: str


TransactionCash = Union[
    TradeEventCashTransactionDividend,
    TradeEventCashTransactionWitholdingTax,
    TradeEventCashTransactionPaymentInLieuOfDividend,
    TradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividend,
]
