from typing import Sequence

from lxml import etree

import Core.FinancialEvents.Schemas.Grouping as pgf
import TaxAuthorityProvider.Schemas.Configuration as tc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration.IFI.Common as common
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss
from Core.FinancialEvents.Services.FinancialEventsProcessor import (
    FinancialEventsProcessor,
)


def generateXmlReport(
    reportConfig: tc.TaxAuthorityConfiguration,
    data: Sequence[pgf.FinancialGrouping],
    templateEnvelope: etree._Element,
    countedProcessor: FinancialEventsProcessor,
) -> etree._Element:
    convertedTrades = common.convertTradesToIfiItems(reportConfig, data, countedProcessor)

    nsmap = templateEnvelope.nsmap
    nsmap[None] = "http://edavki.durs.si/Documents/Schemas/D_IFI_4.xsd"
    envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
    envelope[:] = templateEnvelope[:]

    body = etree.SubElement(envelope, "body")
    etree.SubElement(body, etree.QName(nsmap["edp"], "bodyContent"))

    D_IFI = etree.SubElement(body, "D_IFI")
    etree.SubElement(D_IFI, "PeriodStart").text = reportConfig.fromDate.format("YYYY-MM-DD")
    etree.SubElement(D_IFI, "PeriodEnd").text = reportConfig.toDate.shift(days=-1).format("YYYY-MM-DD")
    # etree.SubElement(KDVP, "CountryOfResidenceID").text = self.taxPayerInfo.countryID
    # etree.SubElement(D_IFI, "TelephoneNumber").text = self.taxPayerInfo.PhoneNumber
    # etree.SubElement(D_IFI, "Email").text = self.taxPayerInfo.email

    for DIFI_item_entry in convertedTrades:
        DIFI_ITEM = etree.SubElement(D_IFI, "TItem")

        etree.SubElement(DIFI_ITEM, "TypeId").text = DIFI_item_entry.ItemType.value
        etree.SubElement(DIFI_ITEM, "Type").text = DIFI_item_entry.InventoryListType.value

        if DIFI_item_entry.InventoryListType == ss.EDavkiDerivativeSecurityType.OPTION_OR_CERTIFICATE:
            etree.SubElement(DIFI_ITEM, "TypeName").text = ss.EDavkiDerivativeSecurityTypeName.OPTION_OR_CERTIFICATE.value
        elif DIFI_item_entry.InventoryListType == ss.EDavkiDerivativeSecurityType.FUTURES_CONTRACT:
            etree.SubElement(DIFI_ITEM, "TypeName").text = ss.EDavkiDerivativeSecurityTypeName.FUTURES_CONTRACT.value
        elif DIFI_item_entry.InventoryListType == ss.EDavkiDerivativeSecurityType.CONTRACT_FOR_DIFFERENCE:
            etree.SubElement(DIFI_ITEM, "TypeName").text = ss.EDavkiDerivativeSecurityTypeName.CONTRACT_FOR_DIFFERENCE.value
        else:
            etree.SubElement(DIFI_ITEM, "TypeName").text = ss.EDavkiDerivativeSecurityTypeName.OTHER.value

        if DIFI_item_entry.Name is not None:
            etree.SubElement(DIFI_ITEM, "Name").text = DIFI_item_entry.Name

        # Code and ISIN are being left out, as the platform doesn't:
        # - Support multiple entries with the same ISIN
        # - Ticker (Code) cannot be longer than 10 characters
        # if DIFI_item_entry.Code is not None:
        #     etree.SubElement(DIFI_ITEM, "Code").text = DIFI_item_entry.Code
        # if DIFI_item_entry.ISIN is not None and DIFI_item_entry.ISIN != "":  # TODO: Figure out why ISIN is empty sometimes
        #     etree.SubElement(DIFI_ITEM, "ISIN").text = DIFI_item_entry.ISIN

        etree.SubElement(DIFI_ITEM, "HasForeignTax").text = str(DIFI_item_entry.HasForeignTax).lower()
        if DIFI_item_entry.ForeignTax is not None:
            etree.SubElement(DIFI_ITEM, "ForeignTax").text = str(DIFI_item_entry.ForeignTax.__round__(8))

        if DIFI_item_entry.FTCountryID is not None:
            etree.SubElement(DIFI_ITEM, "FTCountryID").text = DIFI_item_entry.FTCountryID
        if DIFI_item_entry.FTCountryName is not None:
            etree.SubElement(DIFI_ITEM, "FTCountryName").text = DIFI_item_entry.FTCountryName

        if DIFI_item_entry.ItemType == ss.EDavkiDerivativeReportItemType.DERIVATIVE:

            for entryLine in DIFI_item_entry.Items:
                entry = etree.SubElement(DIFI_ITEM, "TSubItem")

                if isinstance(
                    entryLine,
                    ss.EDavkiDerivativeReportSecurityLineGenericEventBought,
                ):
                    purchase = etree.SubElement(entry, "Purchase")
                    etree.SubElement(purchase, "F1").text = entryLine.BoughtOn.format("YYYY-MM-DD")
                    etree.SubElement(purchase, "F2").text = entryLine.GainType.value
                    etree.SubElement(purchase, "F3").text = str(entryLine.Quantity.__round__(8))
                    etree.SubElement(purchase, "F4").text = str(entryLine.PricePerUnit.__round__(8))
                    etree.SubElement(purchase, "F9").text = str(entryLine.Leveraged).lower()

                if isinstance(entryLine, ss.EDavkiDerivativeReportSecurityLineGenericEventSold):
                    sale = etree.SubElement(entry, "Sale")
                    etree.SubElement(sale, "F5").text = entryLine.SoldOn.format("YYYY-MM-DD")
                    etree.SubElement(sale, "F6").text = str(-entryLine.Quantity.__round__(8))
                    etree.SubElement(sale, "F7").text = str(entryLine.PricePerUnit.__abs__().__round__(8))

    return envelope
