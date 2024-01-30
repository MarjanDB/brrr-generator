from arrow import Arrow
from enum import Enum
from dataclasses import dataclass


# https://www.racunovodstvo.net/zakonodaja/zdoh/90-clen
class EDavkiDividendType(str, Enum):
    UNKNOWN = ""        # For internal use of this reporting script
    ORDINARY = "1"      # Dividenda - tretji odstavek 97. člena Zakona o dohodnini (Uradni list RS, št. 51/3-UPB6)
    CONSTRUCTIVE = "2"  # Prikrito izplačilo dobička, določeno v zakonu, ki ureja davek od dohodka pravnih oseb
    LIQUIDATING = "3"   # Guessing: Dobiček, ki se razdeli v zvezi z dolžniškimi vrednostnimi papirji, ki zagotavljajo udeležbo v dobičku plačnika
    OTHER = "4"         # DOHODEK, KI GA ZAVEZANEC DOSEŽE NA PODLAGI DELITVE DOBIČKA, ČISTEGA DOBIČKA ALI PRIHODKOV INVESTICIJSKEGA SKLADA, RAZEN DOHODKA, KI GA ZAVEZANEC DOSEŽE NA PODLAGI DELITEV PRIHODKOV INVESTICIJSKEGA SKLADA V OBLIKI OBRESTI (3. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZAKONA O DOHODNINI (URADNI LIST RS ŠT. 30/12, 40/12 – ZUJF, 75/12, 94/12, 52/13 – ODL. US, 96/13, 29/14 – ODL. US, 50/14, 23/15, 55/15 IN 63/16)) 
    OTHER_2 = "5"       # VREDNOST VRNJENEGA NAKNADNEGA VPLAČILA (4. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZDOH) 
    BONUS = "6"         # DODATNA NAKNADNA IZPLAČILA V ZVEZI Z ODSVOJITVIJO DELEŽA (5. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZDOH) 

@dataclass
class EDavkiDividendReportLine:
    DateReceived: Arrow
    TaxNumberForDividendPayer: str
    DividendPayerIdentificationNumber: str
    DividendPayerTitle: str
    DividendPayerAddress: str | None
    DividendPayerCountryOfOrigin: str
    DividendType: EDavkiDividendType
    CountryOfOrigin: str
    DividendIdentifierForTracking: str
    TaxReliefParagraphInInternationalTreaty : str | None
    DividendAmount: float = 0
    ForeignTaxPaid: float = 0







class EDavkiTradeSecurityType(str, Enum):
    PLVP = "PLVP" # Popisni list vrednostnega papirja oziroma invecticijskega kupona
    PLVPSHORT = "PLVPSHORT" # Popisni list vrednostnega papirja oziroma invecticijskega kupona SHORT
    PLVPGB = "PLVPG" # Popisni list vrednostnega papirja, ki je v gospodarjenju pri borznoposredniški družbi na podlagi pogodbe o gospodarjenju
    PLVPGBSHORT = "PLVPGBSHORT" # Popisni list vrednostnega papirja, ki je v gospodarjenju pri borznoposredniški družbi na podlagi pogodbe o gospodarjenju SHORT
    PLD = "PLD" # Popisni list deleža v gospodarskih družbah, zadrugah in drugih oblikah organiziranja
    PLVPZOK = "PLVPZOK" # Popisni list vrednostnega papirja za primer zmanjšanja osnovnega kapitala ob nespremenjeni količini vrednostnega papirja


class EDavkiTradeReportGainType(str, Enum):
    CAPITAL_INVESTMENT = "A" # guessing
    BOUGHT = "B"
    CAPITAL_RAISE = "C" # guessing
    CAPITAL_ASSET = "D" # guessing
    CAPITALIZATION_CHANGE = "E" # guessing
    INHERITENCE = "F"
    GIFT = "G"
    OTHER = "H"
    CAPITAL_STOCK_ISSUANCE = "I" # guessing


@dataclass
class EDavkiTradeReportSecurityLineGenericEventBuy:
    BoughtOn: Arrow
    GainType: EDavkiTradeReportGainType
    Quantity: float
    PricePerUnit: float
    TotalPrice: float
    InheritanceAndGiftTaxPaid: float | None
    BaseTaxReduction: float | None

@dataclass
class EDavkiTradeReportSecurityLineGenericEventSell:
    SoldOn: Arrow
    Quantity: float
    TotalPrice: float
    PricePerUnit: float
    WashSale: bool

@dataclass
class EDavkiTradeReportSecurityLineEvent:
    ISIN: str
    Code: str | None
    Name: str | None
    IsFund: bool
    StockExchangeName: str
    Resolution: str | None
    ResolutionDate: Arrow | None

    Events: list[EDavkiTradeReportSecurityLineGenericEventBuy | EDavkiTradeReportSecurityLineGenericEventSell]



@dataclass
class EDavkiGenericTradeReportItem:
    ItemID: str | None
    InventoryListType: EDavkiTradeSecurityType
    Name: str | None
    HasForeignTax: bool
    ForeignTax: float | None
    FTCountryID: str | None
    FTCountryName: str | None
    HasLossTransfer: bool | None
    ForeignTransfer: bool | None
    TaxDecreaseConformance: bool | None # zamenjava vrednostnih papirjev z istovrstnimi papirji istega izdajatelja, pri kateri se ne spreminjajo razmerja med družbeniki in kapital izdajatelja ter ni denarnega toka;

    Items: list[EDavkiTradeReportSecurityLineEvent]
