from typing import Any, Sequence

import arrow
import pandas as pd
from lxml import etree

import src.ConfigurationProvider.Configuration as cpc
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.TaxAuthorityProvider.Common.TaxAuthorityProvider as tap
import src.TaxAuthorityProvider.Schemas.Configuration as c
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration.KDVP.CSV_Doh_KDVP as csv_kdvp
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration.KDVP.XML_Doh_KDVP as xml_kdvp
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.ReportTypes as rt


class SlovenianTaxAuthorityProvider(
    tap.GenericTaxAuthorityProvider[c.TaxAuthorityConfiguration, cpc.TaxPayerInfo, rt.SlovenianTaxAuthorityReportTypes]
):
    def createReportEnvelope(self):
        reportToDate = self.reportConfig.toDate
        config = self.taxPayerInfo

        currentYear = int(arrow.Arrow.now().format("YYYY"))
        lastYear = currentYear - 1
        reportEndPeriod = int(reportToDate.shift(days=-1).format("YYYY"))
        documentType = rt.EDavkiDocumentWorkflowType.ORIGINAL
        if reportEndPeriod < lastYear:
            documentType = rt.EDavkiDocumentWorkflowType.SELF_REPORT

        edp = "http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd"

        nsmap = {"edp": edp, "xs": "http://www.w3.org/2001/XMLSchema"}

        Envelope = etree.Element("Envelope", {}, nsmap=nsmap)

        Header = etree.SubElement(Envelope, etree.QName(edp, "Header"))
        Taxpayer = etree.SubElement(Header, etree.QName(edp, "taxpayer"))
        etree.SubElement(Taxpayer, etree.QName(edp, "taxNumber")).text = config.taxNumber
        etree.SubElement(Taxpayer, etree.QName(edp, "taxpayerType")).text = config.taxpayerType.value  # "FO" see EDP-Common-1 schema
        etree.SubElement(Taxpayer, etree.QName(edp, "name")).text = config.name
        etree.SubElement(Taxpayer, etree.QName(edp, "address1")).text = config.address1
        etree.SubElement(Taxpayer, etree.QName(edp, "address2")).text = config.address2 if config.address2 else ""
        etree.SubElement(Taxpayer, etree.QName(edp, "city")).text = config.city
        etree.SubElement(Taxpayer, etree.QName(edp, "postNumber")).text = config.postNumber
        etree.SubElement(Taxpayer, etree.QName(edp, "postName")).text = config.postName
        etree.SubElement(Envelope, etree.QName(edp, "AttachmentList"))
        etree.SubElement(Envelope, etree.QName(edp, "Signatures"))

        workflow = etree.SubElement(Header, etree.QName(edp, "Workflow"))

        etree.SubElement(workflow, etree.QName(edp, "DocumentWorkflowID")).text = documentType

        return Envelope

    def generateExportForTaxAuthority(self, reportType: rt.SlovenianTaxAuthorityReportTypes, data: Sequence[pgf.UnderlyingGrouping]) -> Any:
        envelope = self.createReportEnvelope()

        if reportType == rt.SlovenianTaxAuthorityReportTypes.DOH_KDVP:
            return xml_kdvp.generateXmlReport(self.reportConfig, self.taxPayerInfo, rt.EDavkiDocumentWorkflowType.ORIGINAL, data, envelope)

    def generateSpreadsheetExport(
        self, reportType: rt.SlovenianTaxAuthorityReportTypes, data: Sequence[pgf.UnderlyingGrouping]
    ) -> pd.DataFrame:
        if reportType == rt.SlovenianTaxAuthorityReportTypes.DOH_KDVP:
            return csv_kdvp.generateDataFrameReport(self.reportConfig, data)

        return pd.DataFrame()
