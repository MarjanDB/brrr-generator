from lxml import etree
from enum import Enum
import pandas as pd
from abc import abstractmethod
from typing import TypeVar, Generic
from Common.Configuration import TaxPayerInfo
from Common.Configuration import ReportBaseConfig
from ReportingStrategies.GenericFormats import GenericDividendLine
from ReportingStrategies.GenericFormats import GenericDividendLineType
from ReportingStrategies.Slovenia.Schemas import EDavkiDividendReportLine
from ReportingStrategies.Slovenia.Schemas import EDavkiDividendType
from InfoProviders.InfoLookupProvider import CompanyLookupProvider
from InfoProviders.InfoLookupProvider import CountryLookupProvider
from InfoProviders.InfoLookupProvider import TreatyType

# https://edavki.durs.si/EdavkiPortal/PersonalPortal/[360253]/Pages/Help/sl/WorkflowType1.htm
class DocumentWorkflowType(str, Enum):
    ORIGINAL = "O"
    SETTLEMENT_ZDAVP2_NO_CLAUSE = "B"
    SETTLEMENT_ZDAVP2_WITH_CLAUSE = "R"
    CORRECTION_WITHIN_30_DAYS_ZDAVP2 = "P"
    SELF_REPORT = "I"
    CORRECTION_WITH_INCREASED_LIABILITIES = "V"
    CORRECTION_WITHIN_12_MONTHS_ZDAVP2 = "Z"
    CANCELLED = "S"


class ReportGenerator:
    taxPayerInfo: TaxPayerInfo

    def __init__(self, taxPayerInfo: TaxPayerInfo):
        self.taxPayerInfo = taxPayerInfo


    def createReportEnvelope(self):
        edp = "http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd"

        nsmap = {
            # None: "http://edavki.durs.si/Documents/Schemas/Doh_Div_3.xsd",
            "edp": edp,
            "xs": "http://www.w3.org/2001/XMLSchema"
        }

        Envelope = etree.Element("Envelope", {}, nsmap=nsmap)

        Header = etree.SubElement(Envelope,  etree.QName(edp, "Header"))
        Taxpayer = etree.SubElement(Header, etree.QName(edp, "taxpayer"))
        etree.SubElement(Taxpayer, etree.QName(edp, "taxNumber")).text = self.taxPayerInfo.taxNumber
        etree.SubElement(Taxpayer, etree.QName(edp, "taxpayerType")).text = self.taxPayerInfo.taxpayerType.value # "FO" see EDP-Common-1 schema
        etree.SubElement(Taxpayer, etree.QName(edp, "name")).text = self.taxPayerInfo.name
        etree.SubElement(Taxpayer, etree.QName(edp, "address1")).text = self.taxPayerInfo.address1
        etree.SubElement(Taxpayer, etree.QName(edp, "address2")).text = self.taxPayerInfo.address2 if self.taxPayerInfo.address2 else ""
        etree.SubElement(Taxpayer, etree.QName(edp, "city")).text = self.taxPayerInfo.city
        etree.SubElement(Taxpayer, etree.QName(edp, "postNumber")).text = self.taxPayerInfo.postNumber
        etree.SubElement(Taxpayer, etree.QName(edp, "postName")).text = self.taxPayerInfo.postName
        etree.SubElement(Envelope, etree.QName(edp, "AttachmentList"))
        etree.SubElement(Envelope, etree.QName(edp, "Signatures"))

        workflow = etree.SubElement(Header, etree.QName(edp, "Workflow"))
        etree.SubElement(workflow, etree.QName(edp, "DocumentWorkflowID")).text = DocumentWorkflowType.ORIGINAL.value

        
        return Envelope
    

INPUT_DATA = TypeVar('INPUT_DATA')
REPORT_CONFIG = TypeVar('REPORT_CONFIG')

class ReportProvider(Generic[INPUT_DATA]):
    companyLookupProvider = CompanyLookupProvider()
    countryLookupProvider = CountryLookupProvider()

    def __init__(self, reportConfig: ReportBaseConfig, taxPayerInfo: TaxPayerInfo) -> None:
        self.reportConfig = reportConfig
        self.taxPayerInfo = taxPayerInfo

    @abstractmethod
    def generateXmlReport(self, data: list[INPUT_DATA], templateEnvelope: etree.ElementBase) -> etree.ElementBase:
        ...

    @abstractmethod
    def generateDataFrameReport(self, data: list[INPUT_DATA],) -> pd.DataFrame:
        ...


class DividendReport(ReportProvider[GenericDividendLine]):
    def segmentDataBasedOnLineType(self, data: list[GenericDividendLine]):
        dividendLines = list(filter(lambda line: line.LineType == GenericDividendLineType.DIVIDEND, data))
        witholdingTax = list(filter(lambda line: line.LineType == GenericDividendLineType.WITHOLDING_TAX, data))

        return {
            GenericDividendLineType.DIVIDEND: dividendLines,
            GenericDividendLineType.WITHOLDING_TAX: witholdingTax
        }
    
    def calculateLines(self, data: list[GenericDividendLine]) -> list[EDavkiDividendReportLine]:
        actionToDividendMapping : dict[str, EDavkiDividendReportLine] = dict()
        segmentedLines = self.segmentDataBasedOnLineType(data)

        for dividend in segmentedLines[GenericDividendLineType.DIVIDEND]:
            actionId = dividend.DividendActionID

            thisDividendLine = EDavkiDividendReportLine(
                DateReceived = dividend.ReceivedDateTime,
                TaxNumberForDividendPayer = "",
                DividendPayerIdentificationNumber = dividend.SecurityISIN,
                DividendPayerTitle = "",
                DividendPayerAddress = "",
                DividendPayerCountryOfOrigin = "",
                DividendType = EDavkiDividendType(dividend.DividendType),
                CountryOfOrigin = "",
                DividendIdentifierForTracking = dividend.DividendActionID,
                TaxReliefParagraphInInternationalTreaty = "",
                DividendAmount = dividend.getAmountInBaseCurrency(),
                ForeignTaxPaid = 0
            )

            if actionToDividendMapping.get(actionId) is None:
                actionToDividendMapping[actionId] = thisDividendLine
                continue

            actionToDividendMapping[actionId].DividendAmount += dividend.getAmountInBaseCurrency()


        for withheldTax in segmentedLines[GenericDividendLineType.WITHOLDING_TAX]:
            actionId = withheldTax.DividendActionID

            thisDividendLine = EDavkiDividendReportLine(
                DateReceived = withheldTax.ReceivedDateTime,
                TaxNumberForDividendPayer = "",
                DividendPayerIdentificationNumber = withheldTax.SecurityISIN,
                DividendPayerTitle = "",
                DividendPayerAddress = "",
                DividendPayerCountryOfOrigin = "",
                DividendType = EDavkiDividendType(withheldTax.DividendType),
                CountryOfOrigin = "",
                DividendIdentifierForTracking = withheldTax.DividendActionID,
                TaxReliefParagraphInInternationalTreaty = "",
                DividendAmount = 0,
                ForeignTaxPaid = withheldTax.getAmountInBaseCurrency()
            )

            # edge case where this witholding tax's dividend has not been processed yet (or does not exist)
            if actionToDividendMapping.get(actionId) is None:
                actionToDividendMapping[actionId] = thisDividendLine
                continue

            actionToDividendMapping[actionId].ForeignTaxPaid += withheldTax.getAmountInBaseCurrency()


        createdLines = list(actionToDividendMapping.values())

        # process company information of created lines

        for dividendLine in createdLines:
            dividendLine.DividendAmount = dividendLine.DividendAmount.__round__(2)
            dividendLine.ForeignTaxPaid = dividendLine.ForeignTaxPaid.__abs__().__round__(2)

            try:
                responsibleCompany = self.companyLookupProvider.getCompanyInfo(dividendLine.DividendPayerIdentificationNumber)

                dividendLine.DividendPayerTitle = responsibleCompany.LongName

                dividendLine.DividendPayerCountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2
                dividendLine.CountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2

                dividendLine.DividendPayerAddress = responsibleCompany.Location.formatAsUnternationalAddress()

                relevantCountry = self.countryLookupProvider.getCountry(responsibleCompany.Location.Country)
                treaty = relevantCountry.treaties.get(TreatyType.TaxRelief)
                
                dividendLine.TaxReliefParagraphInInternationalTreaty = treaty

            except Exception as e:
                print("Failed for ISIN: " + dividendLine.DividendPayerIdentificationNumber)
                print(e)

        return createdLines

    def generateDataFrameReport(self, data: list[GenericDividendLine]) -> pd.DataFrame:
        lines = self.calculateLines(data)

        def convertToDict(data: EDavkiDividendReportLine):
            converted = {
                'Datum prejema dividend': data.DateReceived.format("YYYY-MM-DD"),
                'Davčna številka izplačevalca dividend': data.TaxNumberForDividendPayer,
                'Identifikacijska številka izplačevalca dividend': data.DividendPayerIdentificationNumber,
                'Naziv izplačevalca dividend': data.DividendPayerTitle,
                'Naslov izplačevalca dividend': data.DividendPayerAddress,
                'Država izplačevalca dividend': data.DividendPayerCountryOfOrigin,
                'Šifra vrste dividend': data.DividendType.value,
                'Znesek dividend (v EUR)': data.DividendAmount,
                'Tuji davek (v EUR)': data.ForeignTaxPaid,
                'Država vira': data.CountryOfOrigin,
                'Uveljavljam oprostitev po mednarodni pogodbi': data.TaxReliefParagraphInInternationalTreaty,
                'Action Tracking': data.DividendIdentifierForTracking
            }
            return converted
        
        dataAsDict = list(map(convertToDict, lines))
        dataframe = pd.DataFrame.from_records(dataAsDict)
        return dataframe
    
    

    def generateXmlReport(self, data: list[GenericDividendLine], templateEnvelope: etree.ElementBase) -> etree.ElementBase:
        lines = self.calculateLines(data)

        nsmap = templateEnvelope.nsmap
        nsmap[None] = "http://edavki.durs.si/Documents/Schemas/Doh_Div_3.xsd"
        envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
        envelope[:] = templateEnvelope[:]

        body = etree.SubElement(envelope, "body")

        Doh_Div = etree.SubElement(body, "Doh_Div")
        etree.SubElement(Doh_Div, "Period").text = self.reportConfig.fromDate.format("YYYY")
        etree.SubElement(Doh_Div, "EmailAddress").text = "email"
        etree.SubElement(Doh_Div, "PhoneNumber").text = "telefonska"
        etree.SubElement(Doh_Div, "ResidentCountry").text = self.taxPayerInfo.countryID
        etree.SubElement(Doh_Div, "IsResident").text = str(self.taxPayerInfo.countryID == 'SI').lower()


        def transformDividendLineToXML(line: EDavkiDividendReportLine):
            dividendLine = etree.SubElement(body, "Dividend")
            etree.SubElement(dividendLine, "Date").text = line.DateReceived.format("YYYY-MM-DD")
            etree.SubElement(dividendLine, "PayerTaxNumber").text = line.TaxNumberForDividendPayer
            etree.SubElement(dividendLine, "PayerIdentificationNumber").text = line.DividendPayerIdentificationNumber
            etree.SubElement(dividendLine, "PayerName").text = line.DividendPayerTitle
            etree.SubElement(dividendLine, "PayerAddress").text = line.DividendPayerAddress
            etree.SubElement(dividendLine, "PayerCountry").text = line.DividendPayerCountryOfOrigin
            etree.SubElement(dividendLine, "Type").text = line.DividendType.value
            etree.SubElement(dividendLine, "Value").text = str(line.DividendAmount)
            etree.SubElement(dividendLine, "ForeignTax").text = str(line.ForeignTaxPaid)
            etree.SubElement(dividendLine, "SourceCountry").text = line.CountryOfOrigin
            etree.SubElement(dividendLine, "ReliefStatement").text = line.TaxReliefParagraphInInternationalTreaty

        for line in lines:
            transformDividendLineToXML(line)

        return envelope

