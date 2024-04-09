from dataclasses import dataclass
from enum import Enum
from itertools import groupby
from typing import Sequence

import arrow
import pandas as pd
from lxml import etree

import src.InfoProviders.InfoLookupProvider as ilp
import src.TaxAuthorityProvider.Common.TaxAuthorityProvider as gr
import src.TaxAuthorityProvider.Schemas.GenericFormats as gf
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.ReportTypes as rt
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss


@dataclass
class EDavkiReportConfig(ReportBaseConfig):
    ReportType: EDavkiDocumentWorkflowType


class EDavkiReportWrapper(gr.GenericReportWrapper):
    def createReportEnvelope(
        self,
        documentType: EDavkiDocumentWorkflowType = EDavkiDocumentWorkflowType.ORIGINAL,
    ):
        edp = "http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd"

        nsmap = {"edp": edp, "xs": "http://www.w3.org/2001/XMLSchema"}

        Envelope = etree.Element("Envelope", {}, nsmap=nsmap)

        Header = etree.SubElement(Envelope, etree.QName(edp, "Header"))
        Taxpayer = etree.SubElement(Header, etree.QName(edp, "taxpayer"))
        etree.SubElement(Taxpayer, etree.QName(edp, "taxNumber")).text = self.taxPayerInfo.taxNumber
        etree.SubElement(Taxpayer, etree.QName(edp, "taxpayerType")).text = (
            self.taxPayerInfo.taxpayerType.value
        )  # "FO" see EDP-Common-1 schema
        etree.SubElement(Taxpayer, etree.QName(edp, "name")).text = self.taxPayerInfo.name
        etree.SubElement(Taxpayer, etree.QName(edp, "address1")).text = self.taxPayerInfo.address1
        etree.SubElement(Taxpayer, etree.QName(edp, "address2")).text = self.taxPayerInfo.address2 if self.taxPayerInfo.address2 else ""
        etree.SubElement(Taxpayer, etree.QName(edp, "city")).text = self.taxPayerInfo.city
        etree.SubElement(Taxpayer, etree.QName(edp, "postNumber")).text = self.taxPayerInfo.postNumber
        etree.SubElement(Taxpayer, etree.QName(edp, "postName")).text = self.taxPayerInfo.postName
        etree.SubElement(Envelope, etree.QName(edp, "AttachmentList"))
        etree.SubElement(Envelope, etree.QName(edp, "Signatures"))

        workflow = etree.SubElement(Header, etree.QName(edp, "Workflow"))

        etree.SubElement(workflow, etree.QName(edp, "DocumentWorkflowID")).text = documentType

        return Envelope


class EDavkiDividendReport(gr.GenericDividendReport[EDavkiReportConfig]):
    shouldSelfReport: bool = False

    def createReportEnvelope(self):
        currentYear = int(arrow.Arrow.now().format("YYYY"))
        lastYear = currentYear - 1
        reportEndPeriod = int(self.baseReportConfig.toDate.shift(days=-1).format("YYYY"))
        if reportEndPeriod < lastYear:
            self.shouldSelfReport = True

        return EDavkiReportWrapper.createReportEnvelope(self)  # type: ignore

    def segmentDataBasedOnLineType(self, data: list[gf.GenericDividendLine]):
        dividendLines = list(filter(lambda line: line.LineType == gf.GenericDividendLineType.DIVIDEND, data))
        witholdingTax = list(
            filter(
                lambda line: line.LineType == gf.GenericDividendLineType.WITHOLDING_TAX,
                data,
            )
        )

        return {
            gf.GenericDividendLineType.DIVIDEND: dividendLines,
            gf.GenericDividendLineType.WITHOLDING_TAX: witholdingTax,
        }

    def mergeSameDividendsForUniqueDayIsinType(self, dividends: list[ss.EDavkiDividendReportLine]) -> list[ss.EDavkiDividendReportLine]:
        segmented: dict[str, list[ss.EDavkiDividendReportLine]] = {}
        for key, valuesiter in groupby(
            dividends,
            key=lambda dividend: "{}-{}-{}".format(
                dividend.DateReceived,
                dividend.DividendType,
                dividend.DividendPayerAddress,
            ),
        ):
            segmented[key] = list(v for v in valuesiter)

        mergedDividends: list[ss.EDavkiDividendReportLine] = list()

        for dividendList in segmented.values():
            combinedTotal = sum(map(lambda dividend: dividend.DividendAmount, dividendList))
            combinedTotalTax = sum(map(lambda dividend: dividend.ForeignTaxPaid, dividendList))

            combinedTracking = "-".join(
                list(
                    map(
                        lambda dividend: dividend.DividendIdentifierForTracking,
                        dividendList,
                    )
                )
            )

            generatedMerged = ss.EDavkiDividendReportLine(
                DateReceived=dividendList[0].DateReceived,
                TaxNumberForDividendPayer=dividendList[0].TaxNumberForDividendPayer,
                DividendPayerIdentificationNumber=dividendList[0].DividendPayerIdentificationNumber,
                DividendPayerTitle=dividendList[0].DividendPayerTitle,
                DividendPayerAddress=dividendList[0].DividendPayerAddress,
                DividendPayerCountryOfOrigin=dividendList[0].DividendPayerCountryOfOrigin,
                DividendType=dividendList[0].DividendType,
                CountryOfOrigin=dividendList[0].CountryOfOrigin,
                DividendIdentifierForTracking=combinedTracking,
                TaxReliefParagraphInInternationalTreaty=dividendList[0].TaxReliefParagraphInInternationalTreaty,
                DividendAmount=combinedTotal,
                ForeignTaxPaid=combinedTotalTax,
            )

            mergedDividends.append(generatedMerged)

        return mergedDividends

    def calculateLines(self, data: list[gf.GenericDividendLine]) -> list[ss.EDavkiDividendReportLine]:
        actionToDividendMapping: dict[str, ss.EDavkiDividendReportLine] = dict()
        segmentedLines = self.segmentDataBasedOnLineType(data)

        periodStart = self.baseReportConfig.fromDate
        periodEnd = self.baseReportConfig.toDate

        segmentedLines[gf.GenericDividendLineType.DIVIDEND] = list(
            filter(
                lambda line: line.ReceivedDateTime >= periodStart and line.ReceivedDateTime < periodEnd,
                segmentedLines[gf.GenericDividendLineType.DIVIDEND],
            )
        )
        segmentedLines[gf.GenericDividendLineType.WITHOLDING_TAX] = list(
            filter(
                lambda line: line.ReceivedDateTime >= periodStart and line.ReceivedDateTime < periodEnd,
                segmentedLines[gf.GenericDividendLineType.WITHOLDING_TAX],
            )
        )

        for dividend in segmentedLines[gf.GenericDividendLineType.DIVIDEND]:
            actionId = dividend.DividendActionID

            thisDividendLine = ss.EDavkiDividendReportLine(
                DateReceived=dividend.ReceivedDateTime,
                TaxNumberForDividendPayer="",
                DividendPayerIdentificationNumber=dividend.SecurityISIN,
                DividendPayerTitle="",
                DividendPayerAddress="",
                DividendPayerCountryOfOrigin="",
                DividendType=ss.EDavkiDividendType(dividend.DividendType),
                CountryOfOrigin="",
                DividendIdentifierForTracking=dividend.DividendActionID,
                TaxReliefParagraphInInternationalTreaty="",
                DividendAmount=dividend.getAmountInBaseCurrency(),
                ForeignTaxPaid=0,
            )

            if actionToDividendMapping.get(actionId) is None:
                actionToDividendMapping[actionId] = thisDividendLine
                continue

            actionToDividendMapping[actionId].DividendAmount += dividend.getAmountInBaseCurrency()

        for withheldTax in segmentedLines[gf.GenericDividendLineType.WITHOLDING_TAX]:
            actionId = withheldTax.DividendActionID

            thisDividendLine = ss.EDavkiDividendReportLine(
                DateReceived=withheldTax.ReceivedDateTime,
                TaxNumberForDividendPayer="",
                DividendPayerIdentificationNumber=withheldTax.SecurityISIN,
                DividendPayerTitle="",
                DividendPayerAddress="",
                DividendPayerCountryOfOrigin="",
                DividendType=ss.EDavkiDividendType(withheldTax.DividendType),
                CountryOfOrigin="",
                DividendIdentifierForTracking=withheldTax.DividendActionID,
                TaxReliefParagraphInInternationalTreaty="",
                DividendAmount=0,
                ForeignTaxPaid=withheldTax.getAmountInBaseCurrency(),
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
                treaty = relevantCountry.treaties.get(ilp.TreatyType.TaxRelief)

                dividendLine.TaxReliefParagraphInInternationalTreaty = treaty

            except Exception as e:
                print("Failed for ISIN: " + dividendLine.DividendPayerIdentificationNumber)
                print(e)

        combinedLines = self.mergeSameDividendsForUniqueDayIsinType(createdLines)

        return combinedLines

    def generateDataFrameReport(self, data: list[gf.GenericDividendLine]) -> pd.DataFrame:
        lines = self.calculateLines(data)

        def convertToDict(data: ss.EDavkiDividendReportLine):
            converted = {
                "Datum prejema dividend": data.DateReceived.format("YYYY-MM-DD"),
                "Davčna številka izplačevalca dividend": data.TaxNumberForDividendPayer,
                "Identifikacijska številka izplačevalca dividend": data.DividendPayerIdentificationNumber,
                "Naziv izplačevalca dividend": data.DividendPayerTitle,
                "Naslov izplačevalca dividend": data.DividendPayerAddress,
                "Država izplačevalca dividend": data.DividendPayerCountryOfOrigin,
                "Šifra vrste dividend": data.DividendType.value,
                "Znesek dividend (v EUR)": data.DividendAmount,
                "Tuji davek (v EUR)": data.ForeignTaxPaid,
                "Država vira": data.CountryOfOrigin,
                "Uveljavljam oprostitev po mednarodni pogodbi": data.TaxReliefParagraphInInternationalTreaty,
                "Action Tracking": data.DividendIdentifierForTracking,
            }
            return converted

        dataAsDict = list(map(convertToDict, lines))
        dataframe = pd.DataFrame.from_records(dataAsDict)
        return dataframe

    def generateXmlReport(self, data: list[gf.GenericDividendLine], templateEnvelope: etree.ElementBase) -> etree.ElementBase:
        lines = self.calculateLines(data)

        nsmap = templateEnvelope.nsmap
        nsmap[None] = "http://edavki.durs.si/Documents/Schemas/Doh_Div_3.xsd"
        envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
        envelope[:] = templateEnvelope[:]

        body = etree.SubElement(envelope, "body")

        Doh_Div = etree.SubElement(body, "Doh_Div")
        etree.SubElement(Doh_Div, "Period").text = self.baseReportConfig.fromDate.format("YYYY")
        etree.SubElement(Doh_Div, "EmailAddress").text = "email"
        etree.SubElement(Doh_Div, "PhoneNumber").text = "telefonska"
        etree.SubElement(Doh_Div, "ResidentCountry").text = self.taxPayerInfo.countryID
        etree.SubElement(Doh_Div, "IsResident").text = str(self.taxPayerInfo.countryID == "SI").lower()
        etree.SubElement(Doh_Div, "SelfReport").text = str(self.shouldSelfReport).lower()

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

        for line in lines:
            transformDividendLineToXML(line)

        return envelope


class EDavkiDerivativeReport(gr.GenericDerivativeReport[EDavkiReportConfig]):
    SECURITY_MAPPING: dict[gf.GenericDerivativeReportAssetClassType, ss.EDavkiDerivativeSecurityType] = {
        gf.GenericDerivativeReportAssetClassType.OPTION: ss.EDavkiDerivativeSecurityType.OPTION,
        gf.GenericDerivativeReportAssetClassType.FUTURES_CONTRACT: ss.EDavkiDerivativeSecurityType.FUTURES_CONTRACT,
        gf.GenericDerivativeReportAssetClassType.CONTRACT_FOR_DIFFERENCE: ss.EDavkiDerivativeSecurityType.CONTRACT_FOR_DIFFERENCE,
        gf.GenericDerivativeReportAssetClassType.CERTIFICATE: ss.EDavkiDerivativeSecurityType.CERTIFICATE,
        # gf.GenericDerivativeReportAssetClassType.OTHER: ss.EDavkiDerivativeReportItemType.DERIVATIVE_SHORT,
    }

    GAIN_MAPPINGS: dict[gf.GenericDerivativeReportItemGainType, ss.EDavkiDerivativeReportGainType] = {
        gf.GenericDerivativeReportItemGainType.BOUGHT: ss.EDavkiDerivativeReportGainType.BOUGHT,
        gf.GenericDerivativeReportItemGainType.CAPITAL_INVESTMENT: ss.EDavkiDerivativeReportGainType.CAPITAL_INVESTMENT,
        gf.GenericDerivativeReportItemGainType.CAPITAL_RAISE: ss.EDavkiDerivativeReportGainType.CAPITAL_RAISE,
        gf.GenericDerivativeReportItemGainType.CAPITAL_ASSET: ss.EDavkiDerivativeReportGainType.CAPITAL_ASSET,
        gf.GenericDerivativeReportItemGainType.CAPITALIZATION_CHANGE: ss.EDavkiDerivativeReportGainType.CAPITALIZATION_CHANGE,
        gf.GenericDerivativeReportItemGainType.INHERITENCE: ss.EDavkiDerivativeReportGainType.INHERITENCE,
        gf.GenericDerivativeReportItemGainType.GIFT: ss.EDavkiDerivativeReportGainType.GIFT,
        gf.GenericDerivativeReportItemGainType.OTHER: ss.EDavkiDerivativeReportGainType.OTHER,
    }

    documentType: EDavkiDocumentWorkflowType = EDavkiDocumentWorkflowType.ORIGINAL

    def createReportEnvelope(self):
        currentYear = int(arrow.Arrow.now().format("YYYY"))
        lastYear = currentYear - 1
        reportEndPeriod = int(self.baseReportConfig.toDate.shift(days=-1).format("YYYY"))
        self.documentType = EDavkiDocumentWorkflowType.ORIGINAL
        if reportEndPeriod < lastYear:
            self.documentType = EDavkiDocumentWorkflowType.SELF_REPORT

        return EDavkiReportWrapper.createReportEnvelope(self, self.documentType)  # type: ignore

    def convertTradesToIfiItems(self, data: list[gf.GenericDerivativeReportItem]) -> list[ss.EDavkiGenericDerivativeReportItem]:
        converted: list[ss.EDavkiGenericDerivativeReportItem] = list()

        ISINSegmented: dict[str, list[gf.GenericDerivativeReportItem]] = {}
        for key, valuesiter in groupby(data, key=lambda item: item.ISIN):
            ISINSegmented[key] = list(valuesiter)

        for ISIN, entries in ISINSegmented.items():

            securitySegmented: dict[
                gf.GenericDerivativeReportAssetClassType,
                list[gf.GenericDerivativeReportItem],
            ] = {}
            for key, valuesiter in groupby(entries, key=lambda item: item.AssetClass):
                securitySegmented[key] = list(valuesiter)

            for securityType, securityLines in securitySegmented.items():

                for lots in securityLines:

                    def convertBuy(
                        line: gf.GenericDerivativeReportItemSecurityLineBought,
                    ) -> ss.EDavkiDerivativeReportSecurityLineGenericEventBought:
                        return ss.EDavkiDerivativeReportSecurityLineGenericEventBought(
                            BoughtOn=line.AcquiredDate,
                            GainType=self.GAIN_MAPPINGS[line.AcquiredHow],
                            Quantity=line.NumberOfUnits,
                            PricePerUnit=line.AmountPerUnit,
                            TotalPrice=line.TotalAmountPaid,
                            Leveraged=False,
                        )

                    def convertSell(
                        line: gf.GenericDerivativeReportItemSecurityLineSold,
                    ) -> ss.EDavkiDerivativeReportSecurityLineGenericEventSold:
                        return ss.EDavkiDerivativeReportSecurityLineGenericEventSold(
                            SoldOn=line.SoldDate,
                            Quantity=line.NumberOfUnitsSold,
                            TotalPrice=line.TotalAmountSoldFor,
                            PricePerUnit=line.AmountPerUnit,
                            Leveraged=False,
                        )

                    periodStart = self.baseReportConfig.fromDate
                    periodEnd = self.baseReportConfig.toDate

                    buyLines: list[gf.GenericDerivativeReportItemSecurityLineBought] = list(filter(lambda line: isinstance(line, gf.GenericDerivativeReportItemSecurityLineBought), lots.Lines))  # type: ignore
                    sellLines: list[gf.GenericDerivativeReportItemSecurityLineSold] = list(filter(lambda line: isinstance(line, gf.GenericDerivativeReportItemSecurityLineSold), lots.Lines))  # type: ignore

                    buyLines = list(
                        filter(
                            lambda line: line.AcquiredDate >= periodStart and line.AcquiredDate < periodEnd,
                            buyLines,
                        )
                    )
                    sellLines = list(
                        filter(
                            lambda line: line.SoldDate >= periodStart and line.SoldDate < periodEnd,
                            sellLines,
                        )
                    )

                    buys = list(map(convertBuy, buyLines))  # type: ignore
                    sells = list(map(convertSell, sellLines))  # type: ignore

                    buysAndSells: list[
                        ss.EDavkiDerivativeReportSecurityLineGenericEventBought | ss.EDavkiDerivativeReportSecurityLineGenericEventSold
                    ] = (buys + sells)

                    ForeignTaxPaid = sum(map(lambda entry: entry.ForeignTax or 0, entries))
                    HasForeignTax = True
                    if ForeignTaxPaid <= 0:
                        ForeignTaxPaid = None
                        HasForeignTax = False

                    ISINEntry = ss.EDavkiGenericDerivativeReportItem(
                        InventoryListType=self.SECURITY_MAPPING[securityType],
                        ItemType=ss.EDavkiDerivativeReportItemType.DERIVATIVE,  # TODO: Actually check this for correct type
                        Code=None,
                        ISIN=ISIN,
                        Name=None,
                        HasForeignTax=HasForeignTax,
                        ForeignTax=ForeignTaxPaid,
                        FTCountryID=None,
                        FTCountryName=None,
                        Items=buysAndSells,
                    )

                    converted.append(ISINEntry)

        return converted

    def generateDataFrameReport(self, data: list[gf.GenericDerivativeReportItem]) -> pd.DataFrame:
        convertedTrades = self.convertTradesToIfiItems(data)

        def getLinesFromData(
            entry: ss.EDavkiGenericDerivativeReportItem,
        ) -> pd.DataFrame:

            lines = pd.DataFrame(entry.Items)
            lines["ISIN"] = entry.ISIN
            lines["Ticker"] = entry.Code
            lines["HasForeignTax"] = entry.HasForeignTax
            lines["ForeignTax"] = entry.ForeignTax
            lines["ForeignTaxCountryID"] = entry.FTCountryID
            lines["ForeignTaxCountryName"] = entry.FTCountryName

            return lines

        mappedData = list(map(getLinesFromData, convertedTrades))

        combinedData = pd.concat(mappedData)

        return combinedData

    def generateXmlReport(
        self,
        data: list[gf.GenericDerivativeReportItem],
        templateEnvelope: etree.ElementBase,
    ) -> etree.ElementBase:
        convertedTrades = self.convertTradesToIfiItems(data)

        nsmap = templateEnvelope.nsmap
        nsmap[None] = "http://edavki.durs.si/Documents/Schemas/D_IFI_4.xsd"
        envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
        envelope[:] = templateEnvelope[:]

        body = etree.SubElement(envelope, "body")
        etree.SubElement(body, etree.QName(nsmap["edp"], "bodyContent"))

        D_IFI = etree.SubElement(body, "D_IFI")
        etree.SubElement(D_IFI, "PeriodStart").text = self.baseReportConfig.fromDate.format("YYYY-MM-DD")
        etree.SubElement(D_IFI, "PeriodEnd").text = self.baseReportConfig.toDate.shift(days=-1).format("YYYY-MM-DD")
        # etree.SubElement(KDVP, "CountryOfResidenceID").text = self.taxPayerInfo.countryID
        # etree.SubElement(D_IFI, "TelephoneNumber").text = self.taxPayerInfo.PhoneNumber
        # etree.SubElement(D_IFI, "Email").text = self.taxPayerInfo.email

        for DIFI_item_entry in convertedTrades:
            DIFI_ITEM = etree.SubElement(D_IFI, "TItem")

            etree.SubElement(DIFI_ITEM, "TypeId").text = DIFI_item_entry.ItemType.value
            etree.SubElement(DIFI_ITEM, "Type").text = DIFI_item_entry.InventoryListType.value
            etree.SubElement(DIFI_ITEM, "ISIN").text = DIFI_item_entry.ISIN

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
                        etree.SubElement(sale, "F6").text = str(entryLine.Quantity.__round__(8))
                        etree.SubElement(sale, "F7").text = str(entryLine.PricePerUnit.__abs__().__round__(8))

        return envelope
