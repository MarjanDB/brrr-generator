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
from Core.StagingFinancialEvents.Schemas.FinancialIdentifier import (
    StagingFinancialIdentifier,
)


@dataclass
class StagingTradeEvent:
    ID: str
    FinancialIdentifier: StagingFinancialIdentifier
    AssetClass: GenericAssetClass  # Trades can have to do with different Asset Classes (Stock, Options, ...)
    Date: Arrow
    Multiplier: float  # for Leveraged trades
    ExchangedMoney: GenericMonetaryExchangeInformation


@dataclass
class StagingTradeEventStockAcquired(StagingTradeEvent):
    AcquiredReason: GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class StagingTradeEventStockSold(StagingTradeEvent):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


StagingTradeEventStock = Union[StagingTradeEventStockAcquired, StagingTradeEventStockSold]


@dataclass
class StagingTradeEventDerivativeAcquired(StagingTradeEvent):
    AcquiredReason: GenericDerivativeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class StagingTradeEventDerivativeSold(StagingTradeEvent):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


StagingTradeEventDerivative = Union[StagingTradeEventDerivativeAcquired, StagingTradeEventDerivativeSold]


@dataclass
class StagingTradeEventCashTransaction(StagingTradeEvent):
    ActionID: str
    TransactionID: str
    ListingExchange: str


@dataclass
class StagingTradeEventCashTransactionDividend(StagingTradeEventCashTransaction):
    DividendType: GenericDividendType


@dataclass
class StagingTradeEventCashTransactionWitholdingTax(StagingTradeEventCashTransaction): ...


@dataclass
class StagingTradeEventCashTransactionPaymentInLieuOfDividends(StagingTradeEventCashTransaction):
    DividendType: GenericDividendType


@dataclass
class StagingTradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividends(StagingTradeEventCashTransaction): ...


StagingTransactionCash = Union[
    StagingTradeEventCashTransactionDividend,
    StagingTradeEventCashTransactionWitholdingTax,
    StagingTradeEventCashTransactionPaymentInLieuOfDividends,
    StagingTradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividends,
]
