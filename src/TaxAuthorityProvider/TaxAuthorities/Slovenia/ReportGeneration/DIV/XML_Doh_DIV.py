from typing import Sequence

from lxml import etree

import ConfigurationProvider.Configuration as c
import Core.FinancialEvents.Schemas.Grouping as pgf
import TaxAuthorityProvider.Schemas.Configuration as tc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration.DIV.Common as common
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss


def generateXmlReport(
    reportConfig: tc.TaxAuthorityConfiguration,
    userConfig: c.TaxPayerInfo,
    selfReport: bool,
    data: Sequence[pgf.FinancialGrouping],
    templateEnvelope: etree._Element,
) -> etree._Element:
    convertedTrades = common.convertCashTransactionsToDivItems(reportConfig, data)

    nsmap = templateEnvelope.nsmap
    nsmap[None] = "http://edavki.durs.si/Documents/Schemas/Doh_Div_3.xsd"
    envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
    envelope[:] = templateEnvelope[:]

    body = etree.SubElement(envelope, "body")

    Doh_Div = etree.SubElement(body, "Doh_Div")
    etree.SubElement(Doh_Div, "Period").text = reportConfig.fromDate.format("YYYY")
    etree.SubElement(Doh_Div, "EmailAddress").text = "email"
    etree.SubElement(Doh_Div, "PhoneNumber").text = "telefonska"
    etree.SubElement(Doh_Div, "ResidentCountry").text = userConfig.countryID
    etree.SubElement(Doh_Div, "IsResident").text = str(userConfig.countryID == "SI").lower()
    etree.SubElement(Doh_Div, "SelfReport").text = str(selfReport).lower()

    def transformDividendLineToXML(line: ss.EDavkiDividendReportLine):
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

    for line in convertedTrades:
        transformDividendLineToXML(line)

    return envelope
