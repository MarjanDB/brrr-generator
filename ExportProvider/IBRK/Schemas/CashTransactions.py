import numpy as np
from enum import Enum
import arrow
from arrow import Arrow

class CashTransactionType(Enum):
    WITHOLDING_TAX = 'Withholding Tax'
    Dividends = 'Dividends'


class CashTransactionRow:
    # IBRK Account ID
    ClientAccountID: str
    AccountAlias: str
    
    Model: str

    # Currency of the cash transaction
    CurrencyPrimary: str

    # Conversion ratio from the currency of the cash transaction to the base currency of the client account
    FXRateToBase: float

    # enum
    AssetClass: str

    # enum
    SubCategory: str

    # Ticker
    Symbol: str

    Description: str


    Conid: str
    SecurityID: str
    # enum
    SecurityIDType: str

    Cusip: str

    Isin: str

    Figi: str

    ListingExchange: str

    UnderlyingConid: str
    UnderlyingSymbol: str
    UnderlyingSecurityID: str
    UnderlyingListingExchange: str

    Issuer: str
    IssuerCountryCode: str
    
    Multiplier: float
    
    Strike: str
    Expiry: str

    PutSlashCall: str

    PrincipalAdjustFactor: str

    DateAndTime: Arrow

    SettleDate: Arrow

    Amount: float

    # enum
    Type: CashTransactionType

    TradeID: str
    
    Code: str

    TransactionID: str

    ReportDate: Arrow

    ClientReference: str

    ActionID: str

    # enum
    LevelOfDetail: str

    SerialNumber: str

    DeliveryType: str

    CommodityType: str

    Fineness: float
    Weight: float

    def __init__(self, rawRow):
        self.ClientAccountID = rawRow.ClientAccountID
        self.AccountAlias = rawRow.AccountAlias
        self.Model = rawRow.Model
        self.CurrencyPrimary = rawRow.CurrencyPrimary
        self.FXRateToBase = float(rawRow.FXRateToBase)
        self.AssetClass = rawRow.AssetClass
        self.SubCategory = rawRow.SubCategory
        self.Symbol = rawRow.Symbol
        self.Description = rawRow.Description
        self.Conid = rawRow.Conid
        self.SecurityID = rawRow.SecurityID
        self.Cusip = rawRow.CUSIP
        self.Isin = rawRow.ISIN
        self.Figi = rawRow.FIGI
        self.ListingExchange = rawRow.ListingExchange
        self.UnderlyingConid = rawRow.UnderlyingConid
        self.UnderlyingSymbol = rawRow.UnderlyingSymbol
        self.UnderlyingSecurityID = rawRow.UnderlyingSecurityID
        self.UnderlyingListingExchange = rawRow.UnderlyingListingExchange
        self.Issuer = rawRow.Issuer
        self.IssuerCountryCode = rawRow.IssuerCountryCode
        self.Multiplier = float(rawRow.Multiplier)
        self.Strike = rawRow.Strike
        self.Expiry = rawRow.Expiry
        self.PutSlashCall = rawRow.PutSlashCall
        self.PrincipalAdjustFactor = rawRow.PrincipalAdjustFactor

        safeDateAndTime = str(rawRow.DateAndTime).replace('EDT', 'US/Eastern').replace('EST', 'US/Eastern')
        self.DateAndTime = arrow.get(safeDateAndTime, 'YYYY-MM-DD HH:mm:ss ZZZ')
        self.SettleDate = arrow.get(rawRow.SettleDate)

        self.Amount = float(rawRow.Amount)
        self.Type = CashTransactionType(rawRow.Type)
        self.TradeID = rawRow.TradeID
        self.Code = rawRow.Code
        self.TransactionID = rawRow.TransactionID

        self.ReportDate = arrow.get(rawRow.ReportDate)

        self.ClientReference = rawRow.ClientReference
        self.ActionID = rawRow.ActionID
        self.LevelOfDetail = rawRow.LevelOfDetail
        self.SerialNumber = rawRow.SerialNumber
        self.DeliveryType = rawRow.DeliveryType
        self.CommodityType = rawRow.CommodityType
        self.Fineness = float(rawRow.Fineness)
        self.Weight = float(rawRow.Weight)
        
   


class CashTransactionReport:
    rows : list[CashTransactionRow] = list()

    def __init__(self, rows: np.recarray):
        self.rows = list(map(lambda row: CashTransactionRow(row), rows))

    @staticmethod
    def mergeCashTransactionReports(reports: "list[CashTransactionReport]"):
        allReportRows = list(map(lambda report: report.rows, reports))
        allRows = [x for xs in allReportRows for x in xs]

        uniqueTransactionRows = list({row.TransactionID: row for row in allRows}.values())

        emptyReport = CashTransactionReport([])

        emptyReport.rows = uniqueTransactionRows

        return emptyReport
    
    def getTransactionRowsOfType(self, type: CashTransactionType):
        return list(filter(lambda row: row.Type == type, self.rows))
    


     