from arrow import Arrow
from enum import Enum

class DividendTypes(str, Enum):
    COMMON = "1"        # Dividenda - tretji odstavek 97. člena Zakona o dohodnini (Uradni list RS, št. 51/3-UPB6)
    CONSTRUCTIVE = "2"  # Prikrito izplačilo dobička, določeno v zakonu, ki ureja davek od dohodka pravnih oseb
    LIQUIDATING = "3"   # Guessing: Dobiček, ki se razdeli v zvezi z dolžniškimi vrednostnimi papirji, ki zagotavljajo udeležbo v dobičku plačnika
    OTHER = "4"         #  	Dohodek, dosežen na podlagi delitve čistega dobička vzajemnega sklada ali delitve prihodkov vzajemnega sklada, razen dohodka, ki ga zavezanec doseže na podlagi delitve prihodkov vzajemnega sklada v obliki obresti – 3. točka četrtega odstavka 90. člena Zakona o dohodnini (Uradni list RS, št. 51/10-UPB6)


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

    def __init__(self):
        self.TaxNumberForDividendPayer = ""
        self.DividendPayerIdentificationNumber = ""
        self.DividendPayerTitle = ""
        self.DividendPayerAddress = None
        self.DividendPayerCountryOfOrigin = ""
        self.CountryOfOrigin = ""
        self.TaxReliefParagraphInInternationalTreaty = None


