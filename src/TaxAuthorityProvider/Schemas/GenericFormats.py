from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Generic, Sequence, TypeVar

from arrow import Arrow


class GenericAssetClass(str, Enum):
    STOCK = "STOCK"
    OPTION = "OPTION"
    CASH_AND_CASH_EQUIVALENTS = "CASH_AND_CASH_EQUIVALENTS"
    BOND = "BOND"


class GenericCategory(str, Enum):
    REGULAR = "REGULAR"
    TRUST_FUND = "TRUST_FUND"


class GenericShortLong(str, Enum):
    SHORT = "SHORT"
    LONG = "LONG"


# https://www.racunovodstvo.net/zakonodaja/zdoh/90-clen
class GenericDividendType(str, Enum):
    UNKNOWN = ""  # For internal use of this reporting script
    ORDINARY = "1"  # Dividenda - tretji odstavek 97. člena Zakona o dohodnini (Uradni list RS, št. 51/3-UPB6)
    CONSTRUCTIVE = "2"  # Prikrito izplačilo dobička, določeno v zakonu, ki ureja davek od dohodka pravnih oseb
    LIQUIDATING = (
        "3"  # Guessing: Dobiček, ki se razdeli v zvezi z dolžniškimi vrednostnimi papirji, ki zagotavljajo udeležbo v dobičku plačnika
    )
    OTHER = "4"  # DOHODEK, KI GA ZAVEZANEC DOSEŽE NA PODLAGI DELITVE DOBIČKA, ČISTEGA DOBIČKA ALI PRIHODKOV INVESTICIJSKEGA SKLADA, RAZEN DOHODKA, KI GA ZAVEZANEC DOSEŽE NA PODLAGI DELITEV PRIHODKOV INVESTICIJSKEGA SKLADA V OBLIKI OBRESTI (3. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZAKONA O DOHODNINI (URADNI LIST RS ŠT. 30/12, 40/12 – ZUJF, 75/12, 94/12, 52/13 – ODL. US, 96/13, 29/14 – ODL. US, 50/14, 23/15, 55/15 IN 63/16))
    OTHER_2 = "5"  # VREDNOST VRNJENEGA NAKNADNEGA VPLAČILA (4. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZDOH)
    BONUS = "6"  # DODATNA NAKNADNA IZPLAČILA V ZVEZI Z ODSVOJITVIJO DELEŽA (5. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZDOH)


class GenericDividendLineType(str, Enum):
    DIVIDEND = "DIVIDEND"
    WITHOLDING_TAX = "WITHOLDING_TAX"


@dataclass
class GenericDividendLine:
    AccountID: str
    LineCurrency: str
    ConversionToBaseAccountCurrency: float
    AccountCurrency: str
    ReceivedDateTime: Arrow
    AmountInCurrency: float
    DividendActionID: str
    SecurityISIN: str
    ListingExchange: str
    DividendType: GenericDividendType

    LineType: GenericDividendLineType

    def getAmountInBaseCurrency(self) -> float:
        return self.AmountInCurrency * self.ConversionToBaseAccountCurrency

    def getActionIdentifierForTax(self) -> str:
        return self.DividendActionID


# Names here are just guesses, since I don't know what these corespond to in English
class GenericTradeReportItemType(str, Enum):
    STOCK = "STOCK"
    OPTION = "OPTION"
    STOCK_SHORT = "STOCK_SHORT"
    STOCK_CONTRACT = "STOCK_CONTRACT"
    STOCK_CONTRACT_SHORT = "STOCK_CONTRACT_SHORT"
    COMPANY_SHARE = "COMPANY_SHARE"
    PLVPZOK = "PLVPZOK"


class GenericTradeReportItemGainType(str, Enum):
    CAPITAL_INVESTMENT = "CAPITAL_INVESTMENT"  # guessing
    BOUGHT = "BOUGHT"
    CAPITAL_RAISE = "CAPITAL_RAISE"  # guessing
    CAPITAL_ASSET = "CAPITAL_ASSET"  # guessing
    CAPITALIZATION_CHANGE = "CAPITALIZATION_CHANGE"  # guessing
    INHERITENCE = "INHERITENCE"
    GIFT = "GIFT"
    OTHER = "OTHER"
    RIGHT_TO_NEWLY_ISSUED_STOCK = "RIGHT_TO_NEWLY_ISSUED_STOCK"  # guessing


@dataclass
class GenericMonetaryExchangeInformation:
    UnderlyingCurrency: str
    UnderlyingQuantity: float
    UnderlyingTradePrice: float

    ComissionCurrency: str
    ComissionTotal: float

    TaxCurrency: str
    TaxTotal: float


@dataclass
class GenericTradeEventStaging:
    ID: str
    ISIN: str
    Ticker: str | None
    AssetClass: GenericAssetClass  # Trades can have to do with different Asset Classes (Stock, Options, ...)
    Date: Arrow
    Multiplier: float  # for Leveraged trades
    ExchangedMoney: GenericMonetaryExchangeInformation


@dataclass
class TradeEventStagingStockAcquired(GenericTradeEventStaging):
    AcquiredReason: GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventStagingStockSold(GenericTradeEventStaging):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


@dataclass
class TradeEventStagingDerivativeAcquired(GenericTradeEventStaging):
    AcquiredReason: GenericTradeReportItemGainType
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
    ShortLongType: GenericShortLong  # Some trades can be SHORTING, meaning you first sell and then buy back


@dataclass
class GenericUnderlyingGroupingStaging:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: GenericCategory

    StockTrades: Sequence[TradeEventStagingStockAcquired | TradeEventStagingStockSold]
    StockTaxLots: Sequence[GenericTaxLotEventStaging]

    DerivativeTrades: Sequence[TradeEventStagingDerivativeAcquired | TradeEventStagingDerivativeSold]
    DerivativeTaxLots: Sequence[GenericTaxLotEventStaging]

    Dividends: Sequence[GenericDividendLine]


@dataclass
class GenericTradeEvent:
    ID: str
    ISIN: str
    Ticker: str
    AssetClass: GenericAssetClass  # Trades can have to do with different Asset Classes (Stock, Options, ...)
    Date: Arrow
    Multiplier: float  # for Leveraged trades
    ExchangedMoney: GenericMonetaryExchangeInformation


@dataclass
class TradeEventStockAcquired(GenericTradeEvent):
    AcquiredReason: GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class TradeEventStockSold(GenericTradeEvent):
    ...
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)


@dataclass
class TradeEventDerivativeAcquired(GenericTradeEvent):
    AcquiredReason: GenericTradeReportItemGainType
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
    ShortLongType: GenericShortLong  # Some trades can be SHORTING, meaning you first sell and then buy back


@dataclass
class TradeTaxLotEventStock(GenericTaxLot[TradeEventStockAcquired, TradeEventStockSold]): ...


@dataclass
class TradeTaxLotEventDerivative(GenericTaxLot[TradeEventDerivativeAcquired, TradeEventDerivativeSold]): ...


@dataclass
class UnderlyingGrouping:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]
    StockTaxLots: Sequence[TradeTaxLotEventStock]

    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]
    DerivativeTaxLots: Sequence[TradeTaxLotEventDerivative]

    Dividends: Sequence[GenericDividendLine]


@dataclass
class UnderlyingGroupingWithTradesOfInterest:
    ISIN: str
    CountryOfOrigin: str | None  # None for unknown

    UnderlyingCategory: GenericCategory

    StockTrades: Sequence[TradeEventStockAcquired | TradeEventStockSold]

    DerivativeTrades: Sequence[TradeEventDerivativeAcquired | TradeEventDerivativeSold]

    Dividends: Sequence[GenericDividendLine]


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