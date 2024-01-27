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