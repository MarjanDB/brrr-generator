from arrow import Arrow
from enum import Enum

# https://www.racunovodstvo.net/zakonodaja/zdoh/90-clen
class DividendTypes(str, Enum):
    ORDINARY = "1"      # Dividenda - tretji odstavek 97. člena Zakona o dohodnini (Uradni list RS, št. 51/3-UPB6)
    CONSTRUCTIVE = "2"  # Prikrito izplačilo dobička, določeno v zakonu, ki ureja davek od dohodka pravnih oseb
    LIQUIDATING = "3"   # Guessing: Dobiček, ki se razdeli v zvezi z dolžniškimi vrednostnimi papirji, ki zagotavljajo udeležbo v dobičku plačnika
    OTHER = "4"         # DOHODEK, KI GA ZAVEZANEC DOSEŽE NA PODLAGI DELITVE DOBIČKA, ČISTEGA DOBIČKA ALI PRIHODKOV INVESTICIJSKEGA SKLADA, RAZEN DOHODKA, KI GA ZAVEZANEC DOSEŽE NA PODLAGI DELITEV PRIHODKOV INVESTICIJSKEGA SKLADA V OBLIKI OBRESTI (3. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZAKONA O DOHODNINI (URADNI LIST RS ŠT. 30/12, 40/12 – ZUJF, 75/12, 94/12, 52/13 – ODL. US, 96/13, 29/14 – ODL. US, 50/14, 23/15, 55/15 IN 63/16)) 
    OTHER_2 = "5"       # VREDNOST VRNJENEGA NAKNADNEGA VPLAČILA (4. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZDOH) 
    BONUS = "6"         # DODATNA NAKNADNA IZPLAČILA V ZVEZI Z ODSVOJITVIJO DELEŽA (5. TOČKA ČETRTEGA ODSTAVKA 90. ČLENA ZDOH) 




class DividendLine:
    AccountID: str
    Currency: str
    ConversionToBaseAccountCurrency: float
    AccountCurrency: str
    DividendReceivedDateTime: Arrow
    AmountInDividendCurrency: float
    DividendActionID: str
    SecurityISIN: str
    ListingExchange: str
    DividendType: DividendTypes

    def __init__(self):
        self.AccountID = ""
        self.Currency = ""
        self.AccountCurrency = ""
        self.TaxActionID = ""
        self.SecurityISIN = ""
        self.ListingExchange = ""

    def getAmountInBaseCurrency(self) -> float:
        return self.AmountInDividendCurrency * self.ConversionToBaseAccountCurrency
    
    def getActionIdentifierForTax(self) -> str:
        return self.DividendActionID

class WitholdingTaxLine:
    AccountID: str
    Currency: str
    ConversionToBaseAccountCurrency: float
    AccountCurrency: str
    WitholdingTaxReceivedDateTime: Arrow
    AmountInWitholdingTaxCurrency: float
    TaxActionID: str
    SecurityISIN: str
    ListingExchange: str

    def __init__(self):
        self.AccountID = ""
        self.Currency = ""
        self.AccountCurrency = ""
        self.TaxActionID = ""
        self.SecurityISIN = ""
        self.ListingExchange = ""

    def getAmountInBaseCurrency(self) -> float:
        return self.AmountInWitholdingTaxCurrency * self.ConversionToBaseAccountCurrency
    
    def getActionIdentifier(self) -> str:
        return self.TaxActionID


class DividendReportLine:
    DateReceived: Arrow

    TaxNumberForDividendPayer: str

    DividendPayerIdentificationNumber: str

    DividendPayerTitle: str

    DividendPayerAddress: str | None

    DividendPayerCountryOfOrigin: str

    DividendType: DividendTypes

    DividendAmount: float = 0

    ForeignTaxPaid: float = 0

    CountryOfOrigin: str

    TaxReliefParagraphInInternationalTreaty = str | None


    DividendIdentifierForTracking: str

    def __init__(self):
        self.TaxNumberForDividendPayer = ""
        self.DividendPayerIdentificationNumber = ""
        self.DividendPayerTitle = ""
        self.DividendPayerAddress = None
        self.DividendPayerCountryOfOrigin = ""
        self.CountryOfOrigin = ""
        self.TaxReliefParagraphInInternationalTreaty = None
        self.DividendIdentifierForTracking = ""


