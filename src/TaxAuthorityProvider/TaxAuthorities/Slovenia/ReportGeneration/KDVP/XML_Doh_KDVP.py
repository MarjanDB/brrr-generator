from typing import Sequence

from lxml import etree

import src.ConfigurationProvider.Configuration as c
import src.Core.Schemas.ProcessedGenericFormats as pgf
import src.TaxAuthorityProvider.Schemas.Configuration as tc
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration.KDVP.Common as common
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.ReportTypes as rt
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss


def generateXmlReport(
    reportConfig: tc.TaxAuthorityConfiguration,
    userConfig: c.TaxPayerInfo,
    documentType: rt.EDavkiDocumentWorkflowType,
    data: Sequence[pgf.UnderlyingGrouping],
    templateEnvelope: etree._Element,
) -> etree._Element:
    convertedTrades = common.convertTradesToKdvpItems(reportConfig, data)

    nsmap = templateEnvelope.nsmap
    nsmap[None] = "http://edavki.durs.si/Documents/Schemas/Doh_KDVP_9.xsd"
    envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
    envelope[:] = templateEnvelope[:]

    body = etree.SubElement(envelope, "body")
    etree.SubElement(body, etree.QName(nsmap["edp"], "bodyContent"))

    Doh_KDVP = etree.SubElement(body, "Doh_KDVP")
    KDVP = etree.SubElement(Doh_KDVP, "KDVP")
    etree.SubElement(KDVP, "DocumentWorkflowID").text = documentType.value
    etree.SubElement(KDVP, "Year").text = reportConfig.fromDate.format("YYYY")
    etree.SubElement(KDVP, "PeriodStart").text = reportConfig.fromDate.format("YYYY-MM-DD")
    etree.SubElement(KDVP, "PeriodEnd").text = reportConfig.toDate.shift(days=-1).format("YYYY-MM-DD")
    etree.SubElement(KDVP, "IsResident").text = str(userConfig.countryID == "SI").lower()
    etree.SubElement(KDVP, "SecurityCount").text = "0"
    etree.SubElement(KDVP, "SecurityShortCount").text = "0"
    etree.SubElement(KDVP, "SecurityWithContractCount").text = "0"
    etree.SubElement(KDVP, "SecurityWithContractShortCount").text = "0"
    etree.SubElement(KDVP, "ShareCount").text = "0"
    # etree.SubElement(KDVP, "CountryOfResidenceID").text = config.countryID
    # etree.SubElement(KDVP, "TelephoneNumber").text = "telefonska"
    # etree.SubElement(KDVP, "Email").text = "email"

    for KDVP_item_entry in convertedTrades:
        KDVP_ITEM = etree.SubElement(Doh_KDVP, "KDVPItem")

        etree.SubElement(KDVP_ITEM, "InventoryListType").text = KDVP_item_entry.InventoryListType.value
        etree.SubElement(KDVP_ITEM, "HasForeignTax").text = str(KDVP_item_entry.HasForeignTax).lower()
        if KDVP_item_entry.ForeignTax is not None:
            etree.SubElement(KDVP_ITEM, "ForeignTax").text = str(KDVP_item_entry.ForeignTax.__round__(5))

        if KDVP_item_entry.FTCountryID is not None:
            etree.SubElement(KDVP_ITEM, "FTCountryID").text = KDVP_item_entry.FTCountryID
        if KDVP_item_entry.FTCountryName is not None:
            etree.SubElement(KDVP_ITEM, "FTCountryName").text = KDVP_item_entry.FTCountryName
        etree.SubElement(KDVP_ITEM, "HasLossTransfer").text = str(KDVP_item_entry.HasLossTransfer or False).lower()
        etree.SubElement(KDVP_ITEM, "ForeignTransfer").text = str(KDVP_item_entry.ForeignTransfer or False).lower()
        etree.SubElement(KDVP_ITEM, "TaxDecreaseConformance").text = str(KDVP_item_entry.TaxDecreaseConformance or False).lower()

        if KDVP_item_entry.InventoryListType == ss.EDavkiTradeSecurityType.SECURITY:
            for securityEntry in KDVP_item_entry.Items:
                entry = etree.SubElement(KDVP_ITEM, "Securities")

                etree.SubElement(entry, "ISIN").text = securityEntry.ISIN
                etree.SubElement(entry, "Code").text = securityEntry.Code
                # etree.SubElement(entry, "Name").text = securityEntry.Name
                etree.SubElement(entry, "IsFond").text = str(securityEntry.IsFund).lower()

                if securityEntry.Resolution is not None:
                    etree.SubElement(entry, "Resolution").text = securityEntry.Resolution

                if securityEntry.ResolutionDate is not None:
                    etree.SubElement(entry, "ResolutionDate").text = securityEntry.ResolutionDate.format("YYYY-MM-DD")

                for id, entryLine in enumerate(securityEntry.Events):
                    row = etree.SubElement(entry, "Row")

                    etree.SubElement(row, "ID").text = str(id)

                    if isinstance(
                        entryLine,
                        ss.EDavkiTradeReportSecurityLineGenericEventBought,
                    ):
                        purchase = etree.SubElement(row, "Purchase")
                        etree.SubElement(purchase, "F1").text = entryLine.BoughtOn.format("YYYY-MM-DD")
                        etree.SubElement(purchase, "F2").text = entryLine.GainType.value
                        etree.SubElement(purchase, "F3").text = str(entryLine.Quantity.__round__(5))
                        etree.SubElement(purchase, "F4").text = str(entryLine.PricePerUnit.__round__(5))
                        etree.SubElement(purchase, "F5").text = str(
                            entryLine.InheritanceAndGiftTaxPaid.__round__(5) if entryLine.InheritanceAndGiftTaxPaid is not None else "0"
                        )
                        etree.SubElement(purchase, "F11").text = str(
                            entryLine.BaseTaxReduction.__round__(5) if entryLine.BaseTaxReduction is not None else "0"
                        )

                    if isinstance(entryLine, ss.EDavkiTradeReportSecurityLineGenericEventSold):
                        sale = etree.SubElement(row, "Sale")
                        etree.SubElement(sale, "F6").text = entryLine.SoldOn.format("YYYY-MM-DD")
                        etree.SubElement(sale, "F7").text = str(entryLine.Quantity.__round__(5))
                        etree.SubElement(sale, "F9").text = str(entryLine.PricePerUnit.__abs__().__round__(5))
                        etree.SubElement(sale, "F10").text = str(entryLine.SatisfiesTaxBasisReduction).lower()

    return envelope
