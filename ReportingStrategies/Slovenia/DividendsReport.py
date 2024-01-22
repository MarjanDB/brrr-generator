import ReportingStrategies.Common.Dividend as d
from InfoProviders.CompanyLookupProvider import CompanyLookupProvider
from InfoProviders.CompanyLookupProvider import CountryLookupProvider
from InfoProviders.CompanyLookupProvider import TreatyType
from ReportingStrategies.Slovenia.CommonReport import TaxPayerInfo
import pycountry as pc
import pandas as pd
from lxml import etree
from dataclasses import dataclass

@dataclass
class DividendReportConfig:
    period: str


class DividendsReport:

    dividends: list[d.DividendLine] = list()
    witheldTax: list[d.WitholdingTaxLine] = list()
    companyLookupProvider = CompanyLookupProvider()
    countryLookupProvider = CountryLookupProvider()


    def __init__(self, dividends: list[d.DividendLine], witheldTax: list[d.WitholdingTaxLine]):
        self.dividends = dividends
        self.witheldTax = witheldTax


    def getDividendReport(self) -> list[d.DividendReportLine]:

        # First generate basic report lines from dividends
        actionToDividendMapping : dict[str, d.DividendReportLine] = dict()

        for dividend in self.dividends:
            actionId = dividend.DividendActionID

            if actionToDividendMapping.get(actionId) is None:
                actionToDividendMapping[actionId] = d.DividendReportLine()

            reportLine = actionToDividendMapping[actionId]

            reportLine.DividendAmount += dividend.getAmountInBaseCurrency()
            reportLine.DateReceived = dividend.DividendReceivedDateTime
            reportLine.DividendType = dividend.DividendType

            reportLine.DividendIdentifierForTracking = actionId
            
            try:
                responsibleCompany = self.companyLookupProvider.getCompanyInfo(dividend.SecurityISIN)

                reportLine.DividendPayerTitle = responsibleCompany.LongName

                reportLine.DividendPayerCountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2
                reportLine.CountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2

                reportLine.DividendPayerAddress = responsibleCompany.Location.formatAsUnternationalAddress()

                relevantCountry = self.countryLookupProvider.getCountry(responsibleCompany.Location.Country)
                treaty = relevantCountry.treaties.get(TreatyType.TaxRelief)

                reportLine.TaxReliefParagraphInInternationalTreaty = treaty

            except Exception as e:
                print("Failed for ISIN: " + dividend.SecurityISIN)
                

            # print(reportLine)


        for withheldTax in self.witheldTax:
            actionId = withheldTax.TaxActionID

            if actionToDividendMapping.get(actionId) is None:
                actionToDividendMapping[actionId] = d.DividendReportLine()

            reportLine = actionToDividendMapping[actionId]

            reportLine.ForeignTaxPaid += withheldTax.getAmountInBaseCurrency()
            reportLine.DateReceived = withheldTax.WitholdingTaxReceivedDateTime

            reportLine.DividendIdentifierForTracking = actionId

            try:
                responsibleCompany = self.companyLookupProvider.getCompanyInfo(withheldTax.SecurityISIN)

                reportLine.DividendPayerTitle = responsibleCompany.LongName

                reportLine.DividendPayerCountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2
                reportLine.CountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2

                reportLine.DividendPayerAddress = responsibleCompany.Location.formatAsUnternationalAddress()

                relevantCountry = self.countryLookupProvider.getCountry(responsibleCompany.Location.Country)
                treaty = relevantCountry.treaties.get(TreatyType.TaxRelief)
                
                reportLine.TaxReliefParagraphInInternationalTreaty = treaty

            except Exception as e:
                print("Failed for ISIN: " + withheldTax.SecurityISIN)

        createdLines = list(actionToDividendMapping.values())
        return createdLines
            

    def getDividentReportDataFrame(self) -> pd.DataFrame:
        data = self.getDividendReport()

        def convertToDict(data : d.DividendReportLine):
            converted = {
                'Datum prejema dividend': data.DateReceived.format("YYYY-MM-DD"),
                'Davčna številka izplačevalca dividend': data.TaxNumberForDividendPayer,
                'Identifikacijska številka izplačevalca dividend': data.DividendPayerIdentificationNumber,
                'Naziv izplačevalca dividend': data.DividendPayerTitle,
                'Naslov izplačevalca dividend': data.DividendPayerAddress,
                'Država izplačevalca dividend': data.DividendPayerCountryOfOrigin,
                'Šifra vrste dividend': data.DividendType.value,
                'Znesek dividend (v EUR)': data.DividendAmount.__round__(2),
                'Tuji davek (v EUR)': data.ForeignTaxPaid.__abs__().__round__(2),
                'Država vira': data.CountryOfOrigin,
                'Uveljavljam oprostitev po mednarodni pogodbi': data.TaxReliefParagraphInInternationalTreaty,
                'Action Tracking': data.DividendIdentifierForTracking
            }
            return converted
        
        dataAsDict = list(map(convertToDict, data))

        dataframe = pd.DataFrame.from_records(dataAsDict)

        return dataframe
    
    # https://edavki.durs.si/EdavkiPortal/OpenPortal/pages/technicals/FormsXml.aspx
    def appendToXMLForSubmission(self, data: list[dict[str, str]], config: DividendReportConfig, taxPayerInfo: TaxPayerInfo, templateEnvelope: etree.Element):

        nsmap = templateEnvelope.nsmap
        nsmap[None] = "http://edavki.durs.si/Documents/Schemas/Doh_Div_3.xsd"
        envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
        envelope[:] = templateEnvelope[:]

        body = etree.SubElement(envelope, "body")

        Doh_Div = etree.SubElement(body, "Doh_Div")
        etree.SubElement(Doh_Div, "Period").text = config.period
        etree.SubElement(Doh_Div, "EmailAddress").text = ""
        etree.SubElement(Doh_Div, "PhoneNumber").text = ""
        etree.SubElement(Doh_Div, "ResidentCountry").text = taxPayerInfo.countryID
        etree.SubElement(Doh_Div, "IsResident").text = str(taxPayerInfo.countryID == 'SI').lower()
        # etree.SubElement(Doh_Obr, "Locked").text = False
        # etree.SubElement(Doh_Obr, "SelfReport").text = False
        # etree.SubElement(Doh_Obr, "WfTypeU").text = False

        def transformDividendLineToXML(line: dict[str, str]):
            dividendLine = etree.SubElement(body, "Dividend")
            etree.SubElement(dividendLine, "Date").text = line['Datum prejema dividend']
            etree.SubElement(dividendLine, "PayerTaxNumber").text = line['Davčna številka izplačevalca dividend']
            etree.SubElement(dividendLine, "PayerIdentificationNumber").text = line['Identifikacijska številka izplačevalca dividend']
            etree.SubElement(dividendLine, "PayerName").text = line['Naziv izplačevalca dividend']
            etree.SubElement(dividendLine, "PayerAddress").text = line['Naslov izplačevalca dividend']
            etree.SubElement(dividendLine, "PayerCountry").text = line['Država izplačevalca dividend']
            etree.SubElement(dividendLine, "Type").text = line['Šifra vrste dividend']
            etree.SubElement(dividendLine, "Value").text = str(line['Znesek dividend (v EUR)'])
            etree.SubElement(dividendLine, "ForeignTax").text = str(line['Tuji davek (v EUR)'])
            etree.SubElement(dividendLine, "SourceCountry").text = line['Država vira']
            etree.SubElement(dividendLine, "ReliefStatement").text = line['Uveljavljam oprostitev po mednarodni pogodbi']

        for line in data:
            transformDividendLineToXML(line)    # type: ignore

        return envelope



