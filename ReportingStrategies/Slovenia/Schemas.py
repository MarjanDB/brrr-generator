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
class EDavkiTradeReportSecurityLinePurchase:
    """Datum pridobitve"""
    F1: Arrow

    """Način pridobitve"""
    F2: EDavkiTradeReportGainType

    """Količina"""
    F3: float

    """Nabavna vrednost ob pridobitvi (na enoto)"""
    F4: float

    """Plačan davek na dediščine in darila"""
    F5: float | None

    """Zmanjšana nabavna vrednost vrednostnega papirja (na enoto) zaradi zmanjšanja osnovnega kapitala ob nespremenjeni količini"""
    F11: float | None

@dataclass
class EDavkiTradeReportSecurityLineSale:
    """Datum odsvojitve"""
    F6: Arrow

    """Količina odsvojenega v.p."""
    F7: float

    """Vrednost ob osvojitvi (na enoto)"""
    F9: float

    """Pravilo iz  drugega odstavka v povezavi s petim odstavkom 97.člena ZDoh-2"""
    F10: bool

@dataclass
class EDavkiTradeReportSecurityLine:
    ID: int
    Line: EDavkiTradeReportSecurityLinePurchase | EDavkiTradeReportSecurityLineSale

@dataclass
class EDavkiTradeReportSecurity:
    ISIN: str
    Code: str | None
    Name: str | None
    IsFond: bool
    Resolution: str | None
    ResolutionDate: Arrow | None
    Rows: list[EDavkiTradeReportSecurityLine]


@dataclass
class EDavkiTradeReportSecurityShortLinePurchase:
    """Datum pridobitve"""
    F1: Arrow

    """Način pridobitve"""
    F2: EDavkiTradeReportGainType

    """Količina"""
    F3: float

    """Nabavna vrednost ob pridobitvi (na enoto)"""
    F4: float

    """Plačan davek na dediščine in darila"""
    F5: float | None

@dataclass
class EDavkiTradeReportSecurityShortLineSale:
    """Datum odsvojitve"""
    F6: Arrow

    """Količina odsvojenega v.p."""
    F7: float

    """Vrednost ob osvojitvi (na enoto)"""
    F9: float

@dataclass
class EDavkiTradeReportSecurityShortLine:
    ID: int
    Line: EDavkiTradeReportSecurityShortLinePurchase | EDavkiTradeReportSecurityShortLineSale


@dataclass
class EDavkiTradeReportSecurityShort:
    ISIN: str
    Code: str | None
    Name: str | None
    IsFond: bool
    Rows: list[EDavkiTradeReportSecurityShortLine]



@dataclass
class EDavkiTradeReportSecurityWithContractLinePurchase:
    """Datum pridobitve"""
    F1: Arrow

    """Način pridobitve"""
    F2: EDavkiTradeReportGainType

    """Količina"""
    F3: float

    """Nabavna vrednost ob pridobitvi (na enoto)"""
    F4: float

    """Plačan davek na dediščine in darila"""
    F5: float | None

    """Zmanjšana nabavna vrednost vrednostnega papirja (na enoto) zaradi zmanjšanja osnovnega kapitala ob nespremenjeni količini"""
    F11: float | None

@dataclass
class EDavkiTradeReportSecurityWithContractLineSale:
    """Datum odsvojitve"""
    F6: Arrow

    """Količina odsvojenega v.p."""
    F7: float

    """Vrednost ob osvojitvi (na enoto)"""
    F9: float

    """Pravilo iz  drugega odstavka v povezavi s petim odstavkom 97.člena ZDoh-2"""
    F10: bool

@dataclass
class EDavkiTradeReportSecurityWithContractLine:
    ID: int
    Line: EDavkiTradeReportSecurityWithContractLinePurchase | EDavkiTradeReportSecurityWithContractLineSale

@dataclass
class EDavkiTradeReportSecurityWithContract:
    ISIN: str
    Code: str | None
    Name: str | None
    IsFond: bool
    StockExchangeName: str
    Resolution: str | None
    ResolutionDate: Arrow | None
    Rows: list[EDavkiTradeReportSecurityWithContractLine]





@dataclass
class EDavkiTradeReportSecurityWithContractShortLinePurchase:
    """Datum pridobitve"""
    F1: Arrow

    """Način pridobitve"""
    F2: EDavkiTradeReportGainType

    """Količina"""
    F3: float

    """Nabavna vrednost ob pridobitvi (na enoto)"""
    F4: float

    """Plačan davek na dediščine in darila"""
    F5: float | None

@dataclass
class EDavkiTradeReportSecurityWithContractShortLineSale:
    """Datum odsvojitve"""
    F6: Arrow

    """Količina odsvojenega v.p."""
    F7: float

    """Vrednost ob osvojitvi (na enoto)"""
    F9: float

@dataclass
class EDavkiTradeReportSecurityWithContractShortLine:
    ID: int
    Line: EDavkiTradeReportSecurityWithContractShortLinePurchase | EDavkiTradeReportSecurityWithContractShortLineSale

@dataclass
class EDavkiTradeReportSecurityWithContractShort:
    ISIN: str
    Code: str | None
    Name: str | None
    IsFond: bool
    StockExchangeName: str
    Rows: list[EDavkiTradeReportSecurityWithContractShortLine]



@dataclass
class EDavkiTradeReportShareLinePurchase:
    """Datum pridobitve"""
    F1: Arrow

    """Način pridobitve"""
    F2: EDavkiTradeReportGainType

    """Nabavna vrednost ob pridobitvi"""
    F3: float

    """Plačan davek na dediščine in darila"""
    F4: float

@dataclass
class EDavkiTradeReportShareLineSale:
    """Datum odsvojitve"""
    F5: Arrow

    """% odsvojenega deleža"""
    F6: float

    """Vrednost ob osvojitvi"""
    F8: float

    """Pravilo iz  drugega odstavka v povezavi s petim odstavkom 97.člena ZDoh-2"""
    F18: bool

@dataclass
class EDavkiTradeReportShareLine:
    ID: int
    Line: EDavkiTradeReportShareLinePurchase | EDavkiTradeReportShareLineSale

@dataclass
class EDavkiTradeReportShareLineSubsequentPayments:
    PaymentTaxNumber: str
    PaymentDate: Arrow
    PaymentAmount: float

@dataclass
class EDavkiTradeReportShare:
    Name: str
    DivestmentTaxNumber: str
    SubsequentPayments: bool
    SubsequentPaymentRow: list[EDavkiTradeReportShareLineSubsequentPayments]
    Rows: list[EDavkiTradeReportShareLine]




@dataclass
class EDavkiTradeReportSecurityCapitalReductionLinePurchase:
    """Datum pridobitve"""
    F1: Arrow

    """Način pridobitve"""
    F2: EDavkiTradeReportGainType

    """Količina"""
    F3: float

    """Nabavna vrednost ob pridobitvi (na enoto)"""
    F4: float


@dataclass
class EDavkiTradeReportSecurityCapitalReductionLineSale:
    """Datum odsvojitve"""
    F5: Arrow

    """% zmanjšanja osnovnega kapitala"""
    F6: float

    """Izplačana vrednost na podlagi zmanjšanja osnovnega kapitala"""
    F7: float

@dataclass
class EDavkiTradeReportSecurityCapitalReductionLine:
    ID: int
    Line: EDavkiTradeReportSecurityCapitalReductionLinePurchase | EDavkiTradeReportSecurityCapitalReductionLineSale

@dataclass
class EDavkiTradeReportSecurityCapitalReduction:
    ISIN: str
    Code: str | None
    Name: str | None
    IsFond: bool
    Resolution: str | None
    ResolutionDate: Arrow | None
    Rows: list[EDavkiTradeReportSecurityCapitalReductionLine]





@dataclass
class EDavkiTradeReportItem:
    ItemID: str | None
    InventoryListType: EDavkiTradeSecurityType
    Name: str | None
    HasForeignTax: bool
    ForeignTax: float | None
    FTCountryID: str | None
    FTCountryName: str | None
    HasLossTransfer: bool | None
    ForeignTransfer: bool | None
    TaxDecreaseConformance: bool | None

    Securities: list[EDavkiTradeReportSecurity]
    SecuritiesShort: list[EDavkiTradeReportSecurityShort]
    Shares: list[EDavkiTradeReportShare]
    SecuritiesWithContract: list[EDavkiTradeReportSecurityShort]
    SecuritiesWithcontractShort: list[EDavkiTradeReportSecurityWithContractShort]
    SecuritiesCapitalReduction: list[EDavkiTradeReportSecurityCapitalReduction]

