from lxml import etree
from ExportProvider.IBRK.Schemas import CashTransaction
from ExportProvider.IBRK.Schemas import CashTransactionType
from ExportProvider.IBRK.Schemas import AssetClass
from ExportProvider.IBRK.Schemas import SubCategory
from ExportProvider.IBRK.Schemas import SecurityIDType
from ExportProvider.IBRK.Schemas import Model
from ExportProvider.IBRK.Schemas import LevelOfDetail
import arrow






def extractCashTransactionFromXML(root: etree.ElementBase) -> list[CashTransaction]:
    cashTransactionsFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/CashTransactions/*")
    cashTransactionNodes = cashTransactionsFinder(root)

    def xmlNodeToCashTransaction(node: etree.ElementBase):
        safeDateAndTime = str(node.attrib["dateTime"]).replace('EDT', 'US/Eastern').replace('EST', 'US/Eastern')

        return CashTransaction(
            ClientAccountID=node.attrib["accountId"],
            AccountAlias=node.attrib["acctAlias"],
            Model=Model[node.attrib["model"]],
            CurrencyPrimary=node.attrib["currency"],
            FXRateToBase=float(node.attrib["fxRateToBase"]),
            AssetClass=AssetClass[node.attrib["assetCategory"]],
            SubCategory=SubCategory[node.attrib["subCategory"]],
            Symbol=node.attrib["symbol"],
            Description=node.attrib["description"],
            Conid=node.attrib["conid"],
            SecurityID=node.attrib["securityID"],
            SecurityIDType=SecurityIDType[node.attrib["securityIDType"]],
            CUSIP=node.attrib["cusip"],
            ISIN=node.attrib["isin"],
            FIGI=node.attrib["figi"],
            ListingExchange=node.attrib["listingExchange"],
            UnderlyingConid=node.attrib["underlyingConid"],
            UnderlyingSymbol=node.attrib["underlyingSymbol"],
            UnderlyingSecurityID=node.attrib["underlyingSecurityID"],
            UnderlyingListingExchange=node.attrib["underlyingListingExchange"],
            Issuer=node.attrib["issuer"],
            IssuerCountryCode=node.attrib["issuerCountryCode"],
            Multiplier=float(node.attrib["multiplier"]),
            Strike=node.attrib["strike"],
            Expiry=None,
            PutOrCall=node.attrib["putCall"],
            PrincipalAdjustFactor=None,
            DateTime=arrow.get(safeDateAndTime, 'YYYY-MM-DD HH:mm:ss ZZZ'),
            SettleDate=arrow.get(node.attrib["settleDate"]),
            Amount=float(node.attrib["amount"]),
            Type=CashTransactionType[node.attrib["type"]],
            TradeID=node.attrib["settleDate"],
            Code=node.attrib["code"],
            TransactionID=node.attrib["transactionID"],
            ReportDate=arrow.get(node.attrib["reportDate"]),
            ClientReference=node.attrib["clientReference"],
            ActionID=node.attrib["actionID"],
            LevelOfDetail=LevelOfDetail[node.attrib["levelOfDetail"]],
            SerialNumber=node.attrib["serialNumber"],
            DeliveryType=node.attrib["deliveryType"],
            CommodityType=node.attrib["commodityType"],
            Fineness=float(node.attrib["fineness"]),
            Weight=float(node.attrib["weight"])
        )

    return list(map(lambda node: xmlNodeToCashTransaction(node), cashTransactionNodes))


"""
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


"""