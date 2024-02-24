from enum import Enum
from dataclasses import dataclass
from arrow import Arrow
from typing import Generic, TypeVar

class GenericAssetClass(str, Enum):
    STOCK = "STOCK"
    ROYALTY_TRUST = "ROYALTY_TRUST"
    CASH_AND_CASH_EQUIVALENTS = "CASH_AND_CASH_EQUIVALENTS"
    OPTION = "OPTION"
    BOND = "BOND"

class GenericShortLong(str, Enum):
    SHORT = "SHORT"
    LONG = "LONG"

# https://www.racunovodstvo.net/zakonodaja/zdoh/90-clen
class GenericDividendType(str, Enum):
    UNKNOWN = ""        # For internal use of this reporting script
    ORDINARY = "1"      # Dividenda - tretji odstavek 97. člena Zakona o dohodnini (Uradni list RS, št. 51/3-UPB6)
    CONSTRUCTIVE = "2"  # Prikrito izplačilo dobička, določeno v zakonu, ki ureja davek od dohodka pravnih oseb
    LIQUIDATING = "3"   # Guessing: Dobiček, ki se razdeli v zvezi z dolžniškimi vrednostnimi papirji, ki zagotavljajo udeležbo v dobičku plačnika
    OTHER = "4"         # DOHODEK, KI GA ZAVEZANEC DOSEŽE NA PODLAGI DELITVE DOBIČKA, ČISTEGA DOBIČKA ALI PRIHODKOV INVESTICIJSKEGA SKLADA, RAZEN DOHODKA, KI GA ZAVEZANEC DOSEŽE NA PODLAGI DELITEV PRIHODKOV INVESTICIJSKEGA SKLADA V OBLIKI OBRESTI (3. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZAKONA O DOHODNINI (URADNI LIST RS ŠT. 30/12, 40/12 – ZUJF, 75/12, 94/12, 52/13 – ODL. US, 96/13, 29/14 – ODL. US, 50/14, 23/15, 55/15 IN 63/16)) 
    OTHER_2 = "5"       # VREDNOST VRNJENEGA NAKNADNEGA VPLAČILA (4. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZDOH) 
    BONUS = "6"         # DODATNA NAKNADNA IZPLAČILA V ZVEZI Z ODSVOJITVIJO DELEŽA (5. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZDOH) 

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
    CAPITAL_INVESTMENT = "CAPITAL_INVESTMENT" # guessing
    BOUGHT = "BOUGHT"
    CAPITAL_RAISE = "CAPITAL_RAISE" # guessing
    CAPITAL_ASSET = "CAPITAL_ASSET" # guessing
    CAPITALIZATION_CHANGE = "CAPITALIZATION_CHANGE" # guessing
    INHERITENCE = "INHERITENCE"
    GIFT = "GIFT"
    OTHER = "OTHER"
    RIGHT_TO_NEWLY_ISSUED_STOCK = "RIGHT_TO_NEWLY_ISSUED_STOCK" # guessing




@dataclass
class GenericTradeEvent:
    ID: str
    AssetClass: GenericAssetClass       # Trades can have to do with different Asset Classes (Stock, Options, ...)
    Date: Arrow
    Quantity: float
    AmountPerQuantity: float
    TotalAmount: float
    TaxTotal: float
    ShortLongType: GenericShortLong     # Some trades can be SHORTING, meaning you first sell and then buy back
    Multiplier: float                   # for Leveraged trades


GenericTaxLotAcquiredEvent = TypeVar("GenericTaxLotAcquiredEvent")
GenericTaxLotSoldEvent = TypeVar("GenericTaxLotSoldEvent")

@dataclass
class GenericTaxLot(Generic[GenericTaxLotAcquiredEvent, GenericTaxLotSoldEvent]):
    ID: str
    Quantity: float
    Acquired: GenericTaxLotAcquiredEvent
    Sold: GenericTaxLotSoldEvent


@dataclass
class GenericTradeEventStockAcquired(GenericTradeEvent):
    AcquiredReason: GenericTradeReportItemGainType
    # Related: ??       # connect with corporate actions for better generation of reports


@dataclass
class GenericTradeEventStockSold(GenericTradeEvent):
    HasTradesToUnderlyingRecently: bool         # Used for Wash Sale rules
    # Related: ??       # connect with corporate actions for better generation of reports (mergers can lead to "sold" stocks)





@dataclass
class GenericTradeReportItemSecurityLineBought:
    AcquiredDate: Arrow
    AcquiredHow: GenericTradeReportItemGainType
    NumberOfUnits: float
    AmountPerUnit: float
    TotalAmountPaid: float  # to avoid rounding errors in case of % purchases
    TaxPaidForPurchase: float
    TransactionID: str


@dataclass
class GenericTradeReportItemSecurityLineSold:
    SoldDate: Arrow
    NumberOfUnitsSold: float
    AmountPerUnit: float
    TotalAmountSoldFor: float
    TransactionID: str
    WashSale: bool  # no trades 30 days before and after, and sold for loss
    SoldForProfit: bool

@dataclass
class GenericTradeReportLotMatches:
    TransactionID: str
    Quantitiy: float
    LotOriginalBuy: GenericTradeReportItemSecurityLineBought
    LotOriginalSell: GenericTradeReportItemSecurityLineSold


@dataclass
class GenericTradeReportItem:
    InventoryListType: GenericTradeReportItemType
    AssetClass: GenericAssetClass
    ISIN: str
    Ticker: str
    HasForeignTax: bool
    ForeignTax: float | None
    ForeignTaxCountryID: str | None
    ForeignTaxCountryName: str | None

    Lines: list[GenericTradeReportItemSecurityLineBought | GenericTradeReportItemSecurityLineSold]




















class GenericDerivativeReportItemType(str, Enum):
    DERIVATIVE = "DERIVATIVE"
    DERIVATIVE_SHORT = "DERIVATIVE_SHORT"

class GenericDerivativeReportAssetClassType(str, Enum):
    FUTURES_CONTRACT = "FUTURES_CONTRACT" # https://www.investopedia.com/terms/f/futurescontract.asp
    CONTRACT_FOR_DIFFERENCE = "CFD" # https://www.investopedia.com/terms/c/contractfordifferences.asp
    OPTION = "OPTION"
    CERTIFICATE = "CERTIFICATE"
    OTHER = "OTHER"

class GenericDerivativeReportItemGainType(str, Enum):
    CAPITAL_INVESTMENT = "CAPITAL_INVESTMENT" # guessing
    BOUGHT = "BOUGHT"
    CAPITAL_RAISE = "CAPITAL_RAISE" # guessing
    CAPITAL_ASSET = "CAPITAL_ASSET" # guessing
    CAPITALIZATION_CHANGE = "CAPITALIZATION_CHANGE" # guessing
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
