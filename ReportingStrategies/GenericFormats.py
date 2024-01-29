from enum import Enum
from dataclasses import dataclass
from arrow import Arrow

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
    CAPITAL_STOCK_ISSUANCE = "CAPITAL_STOCK_ISSUANCE" # guessing


@dataclass
class GenericTradeReportItemSecurityLineBought:
    AcquiredDate: Arrow
    AcquiredHow: GenericTradeReportItemGainType
    NumberOfUnits: float
    AmountPerUnit: float
    TotalAmountPaid: float  # to avoid rounding errors in case of % purchases
    TaxPaidForPurchase: float


@dataclass
class GenericTradeReportItemSecurityLineSold:
    SoldDate: Arrow
    NumberOfUnitsSold: float
    AmountPerUnit: float
    TotalAmountSoldFor: float
    WashSale: bool # https://www.investopedia.com/terms/w/washsale.asp


@dataclass
class GenericTradeReportItem:
    InventoryListType: GenericTradeReportItemType
    ISIN: str
    Ticker: str
    HasForeignTax: bool
    ForeignTax: float | None
    ForeignTaxCountryID: str | None
    ForeignTaxCountryName: str | None

    Lines: list[GenericTradeReportItemSecurityLineBought | GenericTradeReportItemSecurityLineSold]
