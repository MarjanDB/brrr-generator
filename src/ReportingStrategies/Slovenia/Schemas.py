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
    SECURITY = "PLVP" # Popisni list vrednostnega papirja oziroma invecticijskega kupona
    SECURITY_SHORT = "PLVPSHORT" # Popisni list vrednostnega papirja oziroma invecticijskega kupona SHORT
    SECURITY_WITH_CONTRACT = "PLVPG" # Popisni list vrednostnega papirja, ki je v gospodarjenju pri borznoposredniški družbi na podlagi pogodbe o gospodarjenju
    SECURITY_WITH_CONTRACT_SHORT = "PLVPGBSHORT" # Popisni list vrednostnega papirja, ki je v gospodarjenju pri borznoposredniški družbi na podlagi pogodbe o gospodarjenju SHORT
    SHARE = "PLD" # Popisni list deleža v gospodarskih družbah, zadrugah in drugih oblikah organiziranja
    SECURITY_WITH_CAPITAL_REDUCTION = "PLVPZOK" # Popisni list vrednostnega papirja za primer zmanjšanja osnovnega kapitala ob nespremenjeni količini vrednostnega papirja


class EDavkiTradeReportGainType(str, Enum):
    CAPITAL_INVESTMENT = "A" # guessing
    BOUGHT = "B"
    CAPITAL_RAISE = "C" # guessing
    CAPITAL_ASSET_RAISE = "D" # guessing
    CAPITALIZATION_CHANGE = "E" # guessing
    INHERITENCE = "F"
    GIFT = "G"
    OTHER = "H"


@dataclass
class EDavkiTradeReportSecurityLineGenericEventBought:
    BoughtOn: Arrow
    GainType: EDavkiTradeReportGainType
    Quantity: float
    PricePerUnit: float
    TotalPrice: float
    InheritanceAndGiftTaxPaid: float | None
    BaseTaxReduction: float | None

@dataclass
class EDavkiTradeReportSecurityLineGenericEventSold:
    SoldOn: Arrow
    Quantity: float
    TotalPrice: float
    PricePerUnit: float
    SatisfiesTaxBasisReduction: bool

@dataclass
class EDavkiTradeReportSecurityLineEvent:
    ISIN: str
    Code: str | None
    Name: str | None
    IsFund: bool
    Resolution: str | None
    ResolutionDate: Arrow | None

    Events: list[EDavkiTradeReportSecurityLineGenericEventBought | EDavkiTradeReportSecurityLineGenericEventSold]



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








class EDavkiDerivativeSecurityType(str, Enum):
    FUTURES_CONTRACT = "01" 
    CONTRACT_FOR_DIFFERENCE = "02"
    OPTION = "03"
    CERTIFICATE = "04"

class EDavkiDerivativeReportGainType(str, Enum):
    CAPITAL_INVESTMENT = "A" # guessing
    BOUGHT = "B"
    CAPITAL_RAISE = "C" # guessing
    CAPITAL_ASSET = "D" # guessing
    CAPITALIZATION_CHANGE = "E" # guessing
    INHERITENCE = "F"
    GIFT = "G"
    OTHER = "H"

class EDavkiDerivativeReportItemType(str, Enum):
    DERIVATIVE = "PLIFI"
    DERIVATIVE_SHORT = "PLIFIShort"




@dataclass
class EDavkiDerivativeReportSecurityLineGenericEventBought:
    BoughtOn: Arrow
    GainType: EDavkiDerivativeReportGainType
    Quantity: float
    PricePerUnit: float
    TotalPrice: float
    Leveraged: bool    # Options are not Leveraged

@dataclass
class EDavkiDerivativeReportSecurityLineGenericEventSold:
    SoldOn: Arrow
    Quantity: float
    TotalPrice: float
    PricePerUnit: float
    Leveraged: bool



@dataclass
class EDavkiGenericDerivativeReportItem:
    InventoryListType: EDavkiDerivativeSecurityType
    Name: str | None
    Code: str | None
    ISIN: str
    HasForeignTax: bool
    ForeignTax: float | None
    FTCountryID: str | None
    FTCountryName: str | None

    Items: list[EDavkiDerivativeReportSecurityLineGenericEventBought | EDavkiDerivativeReportSecurityLineGenericEventSold]
