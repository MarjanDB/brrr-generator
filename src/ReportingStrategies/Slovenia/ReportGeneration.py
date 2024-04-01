from lxml import etree
from enum import Enum
import pandas as pd
from typing import Sequence
import src.ReportingStrategies.GenericFormats as gf
import src.ReportingStrategies.Slovenia.Schemas as ss
import src.InfoProviders.InfoLookupProvider as ilp
import src.ReportingStrategies.GenericReports as gr
from itertools import groupby
from src.ConfigurationProvider.Configuration import ReportBaseConfig
from dataclasses import dataclass
import arrow

# https://edavki.durs.si/EdavkiPortal/PersonalPortal/[360253]/Pages/Help/sl/WorkflowType1.htm
class EDavkiDocumentWorkflowType(str, Enum):
    ORIGINAL = "O"
    SETTLEMENT_ZDAVP2_NO_CLAUSE = "B"
    SETTLEMENT_ZDAVP2_WITH_CLAUSE = "R"
    CORRECTION_WITHIN_30_DAYS_ZDAVP2 = "P"
    SELF_REPORT = "I"
    CORRECTION_WITH_INCREASED_LIABILITIES = "V"
    CORRECTION_WITHIN_12_MONTHS_ZDAVP2 = "Z"
    CANCELLED = "S"

@dataclass
class EDavkiReportConfig(ReportBaseConfig):
    ReportType: EDavkiDocumentWorkflowType



class EDavkiReportWrapper(gr.GenericReportWrapper):
    def createReportEnvelope(self, documentType: EDavkiDocumentWorkflowType = EDavkiDocumentWorkflowType.ORIGINAL):
        edp = "http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd"

        nsmap = {
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

        etree.SubElement(workflow, etree.QName(edp, "DocumentWorkflowID")).text = documentType
        
        return Envelope
    



class EDavkiDividendReport(gr.GenericDividendReport[EDavkiReportConfig]):
    shouldSelfReport: bool = False

    def createReportEnvelope(self):
        currentYear = int(arrow.Arrow.now().format("YYYY"))
        lastYear = currentYear - 1
        reportEndPeriod = int(self.baseReportConfig.toDate.shift(days = -1).format("YYYY"))
        if reportEndPeriod < lastYear:
            self.shouldSelfReport = True


        return EDavkiReportWrapper.createReportEnvelope(self)  # type: ignore


    def segmentDataBasedOnLineType(self, data: list[gf.GenericDividendLine]):
        dividendLines = list(filter(lambda line: line.LineType == gf.GenericDividendLineType.DIVIDEND, data))
        witholdingTax = list(filter(lambda line: line.LineType == gf.GenericDividendLineType.WITHOLDING_TAX, data))

        return {
            gf.GenericDividendLineType.DIVIDEND: dividendLines,
            gf.GenericDividendLineType.WITHOLDING_TAX: witholdingTax
        }
    
    def calculateLines(self, data: list[gf.GenericDividendLine]) -> list[ss.EDavkiDividendReportLine]:
        actionToDividendMapping : dict[str, ss.EDavkiDividendReportLine] = dict()
        segmentedLines = self.segmentDataBasedOnLineType(data)
        
        periodStart = self.baseReportConfig.fromDate
        periodEnd = self.baseReportConfig.toDate

        segmentedLines[gf.GenericDividendLineType.DIVIDEND] = list(filter(lambda line: line.ReceivedDateTime >= periodStart and line.ReceivedDateTime < periodEnd, segmentedLines[gf.GenericDividendLineType.DIVIDEND]))
        segmentedLines[gf.GenericDividendLineType.WITHOLDING_TAX] = list(filter(lambda line: line.ReceivedDateTime >= periodStart and line.ReceivedDateTime < periodEnd, segmentedLines[gf.GenericDividendLineType.WITHOLDING_TAX]))

        for dividend in segmentedLines[gf.GenericDividendLineType.DIVIDEND]:
            actionId = dividend.DividendActionID

            thisDividendLine = ss.EDavkiDividendReportLine(
                DateReceived = dividend.ReceivedDateTime,
                TaxNumberForDividendPayer = "",
                DividendPayerIdentificationNumber = dividend.SecurityISIN,
                DividendPayerTitle = "",
                DividendPayerAddress = "",
                DividendPayerCountryOfOrigin = "",
                DividendType = ss.EDavkiDividendType(dividend.DividendType),
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


        for withheldTax in segmentedLines[gf.GenericDividendLineType.WITHOLDING_TAX]:
            actionId = withheldTax.DividendActionID

            thisDividendLine = ss.EDavkiDividendReportLine(
                DateReceived = withheldTax.ReceivedDateTime,
                TaxNumberForDividendPayer = "",
                DividendPayerIdentificationNumber = withheldTax.SecurityISIN,
                DividendPayerTitle = "",
                DividendPayerAddress = "",
                DividendPayerCountryOfOrigin = "",
                DividendType = ss.EDavkiDividendType(withheldTax.DividendType),
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
                treaty = relevantCountry.treaties.get(ilp.TreatyType.TaxRelief)
                
                dividendLine.TaxReliefParagraphInInternationalTreaty = treaty

            except Exception as e:
                print("Failed for ISIN: " + dividendLine.DividendPayerIdentificationNumber)
                print(e)

        return createdLines

    def generateDataFrameReport(self, data: list[gf.GenericDividendLine]) -> pd.DataFrame:
        lines = self.calculateLines(data)

        def convertToDict(data: ss.EDavkiDividendReportLine):
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
        etree.SubElement(Doh_Div, "IsResident").text = str(self.taxPayerInfo.countryID == 'SI').lower()
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



class EDavkiTradesReport(gr.GenericTradesReport[EDavkiReportConfig]):
    SECURITY_MAPPING : dict[gf.GenericTradeReportItemType, ss.EDavkiTradeSecurityType] = {
        gf.GenericTradeReportItemType.STOCK: ss.EDavkiTradeSecurityType.SECURITY,
        gf.GenericTradeReportItemType.STOCK_SHORT: ss.EDavkiTradeSecurityType.SECURITY_SHORT,
        gf.GenericTradeReportItemType.STOCK_CONTRACT: ss.EDavkiTradeSecurityType.SECURITY_WITH_CONTRACT,
        gf.GenericTradeReportItemType.STOCK_CONTRACT_SHORT: ss.EDavkiTradeSecurityType.SECURITY_WITH_CONTRACT_SHORT,
        gf.GenericTradeReportItemType.COMPANY_SHARE: ss.EDavkiTradeSecurityType.SHARE,
        gf.GenericTradeReportItemType.PLVPZOK: ss.EDavkiTradeSecurityType.SECURITY_WITH_CAPITAL_REDUCTION,
    }

    GAIN_MAPPINGS : dict[gf.GenericTradeReportItemGainType, ss.EDavkiTradeReportGainType] = {
        gf.GenericTradeReportItemGainType.BOUGHT: ss.EDavkiTradeReportGainType.BOUGHT,
        gf.GenericTradeReportItemGainType.CAPITAL_INVESTMENT: ss.EDavkiTradeReportGainType.CAPITAL_INVESTMENT,
        gf.GenericTradeReportItemGainType.CAPITAL_RAISE: ss.EDavkiTradeReportGainType.CAPITAL_RAISE,
        gf.GenericTradeReportItemGainType.CAPITAL_ASSET: ss.EDavkiTradeReportGainType.CAPITAL_ASSET_RAISE,
        gf.GenericTradeReportItemGainType.CAPITALIZATION_CHANGE: ss.EDavkiTradeReportGainType.CAPITALIZATION_CHANGE,
        gf.GenericTradeReportItemGainType.INHERITENCE: ss.EDavkiTradeReportGainType.INHERITENCE,
        gf.GenericTradeReportItemGainType.GIFT: ss.EDavkiTradeReportGainType.GIFT,
        gf.GenericTradeReportItemGainType.OTHER: ss.EDavkiTradeReportGainType.OTHER,
        gf.GenericTradeReportItemGainType.RIGHT_TO_NEWLY_ISSUED_STOCK: ss.EDavkiTradeReportGainType.OTHER,
    }

    documentType: EDavkiDocumentWorkflowType = EDavkiDocumentWorkflowType.ORIGINAL

    def createReportEnvelope(self):
        currentYear = int(arrow.Arrow.now().format("YYYY"))
        lastYear = currentYear - 1
        reportEndPeriod = int(self.baseReportConfig.toDate.shift(days = -1).format("YYYY"))
        self.documentType = EDavkiDocumentWorkflowType.ORIGINAL
        if reportEndPeriod < lastYear:
            self.documentType = EDavkiDocumentWorkflowType.SELF_REPORT


        return EDavkiReportWrapper.createReportEnvelope(self, self.documentType)  # type: ignore


    def convertTradesToKdvpItems(self, data: Sequence[gf.UnderlyingGrouping]) -> list[ss.EDavkiGenericTradeReportItem]:
        converted: list[ss.EDavkiGenericTradeReportItem] = list()
        periodStart = self.baseReportConfig.fromDate
        periodEnd = self.baseReportConfig.toDate

        for isinGrouping in data:
            ISIN = isinGrouping.ISIN

            def convertStockBuy(line: gf.TradeEventStockAcquired) -> ss.EDavkiTradeReportSecurityLineGenericEventBought:
                return ss.EDavkiTradeReportSecurityLineGenericEventBought(
                    BoughtOn = line.Date,
                    GainType = self.GAIN_MAPPINGS[line.AcquiredReason],
                    Quantity = line.Quantity,
                    PricePerUnit = line.AmountPerQuantity,
                    TotalPrice = line.TotalAmount,
                    InheritanceAndGiftTaxPaid = None,
                    BaseTaxReduction = None
                )

            def convertStockSell(line: gf.TradeEventStockSold) -> ss.EDavkiTradeReportSecurityLineGenericEventSold:
                return ss.EDavkiTradeReportSecurityLineGenericEventSold(
                    SoldOn = line.Date,
                    Quantity = line.Quantity,
                    TotalPrice = line.TotalAmount,
                    PricePerUnit = line.AmountPerQuantity,
                    SatisfiesTaxBasisReduction = False # TODO: Wash sale handling
                )
            
            def convertStock(line: gf.TradeEventStockAcquired | gf.TradeEventStockSold) -> ss.EDavkiTradeReportSecurityLineGenericEventBought | ss.EDavkiTradeReportSecurityLineGenericEventSold:
                if isinstance(line, gf.TradeEventStockAcquired):
                    return convertStockBuy(line)
                
                return convertStockSell(line)
            
            buyLines : list[gf.TradeEventStockAcquired] = []
            sellLines : list[gf.TradeEventStockSold] = []
            lots = isinGrouping.StockTaxLots

            for lot in lots:
                closedOn = lot.Sold.Date

                # lot was not closed during the reporting period, so its trades should not be included in the generated report
                if closedOn < periodStart or closedOn > periodEnd:
                    continue
                
                buyLines.append(lot.Acquired)
                sellLines.append(lot.Sold)



            allLines = buyLines + sellLines
            allLines.sort(key=lambda line: line.Date)

            # If there are no lines to report on, do not add it to the ISIN to be reported
            if len(allLines) == 0:
                continue

            convertedLines = list(map(convertStock, allLines))

            
            isTrustFund = isinGrouping.UnderlyingCategory == gf.GenericCategory.TRUST_FUND

            tickerSymbols = list(map(lambda line: line.Ticker, allLines)).pop() # TODO: Maybe something better than just taking the last one?

            reportItem = ss.EDavkiTradeReportSecurityLineEvent(
                ISIN = ISIN,
                Code = tickerSymbols,
                Name = None,
                IsFund = isTrustFund,
                Resolution = None,
                ResolutionDate = None,
                Events = convertedLines
            )

            ForeignTaxPaid = sum(map(lambda entry: entry.TaxTotal or 0, allLines))
            HasForeignTax = True
            if ForeignTaxPaid <= 0:
                ForeignTaxPaid = None
                HasForeignTax = False
            
            ISINEntry = ss.EDavkiGenericTradeReportItem(
                ItemID = None,
                InventoryListType = ss.EDavkiTradeSecurityType.SECURITY,    # TODO: Respect listing type
                Name = None,
                HasForeignTax = HasForeignTax,
                ForeignTax = ForeignTaxPaid,
                FTCountryID = None,
                FTCountryName = None,
                HasLossTransfer = None,
                ForeignTransfer = None,
                TaxDecreaseConformance = False,    
                Items=[reportItem]
            )

            converted.append(ISINEntry)

        return converted




    def generateXmlReport(self, data: Sequence[gf.UnderlyingGrouping], templateEnvelope: etree._Element) -> etree.ElementBase:
        convertedTrades = self.convertTradesToKdvpItems(data)

        nsmap = templateEnvelope.nsmap
        nsmap[None] = "http://edavki.durs.si/Documents/Schemas/Doh_KDVP_9.xsd"
        envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
        envelope[:] = templateEnvelope[:]

        body = etree.SubElement(envelope, "body")
        etree.SubElement(body, etree.QName(nsmap['edp'], 'bodyContent'))

        Doh_KDVP = etree.SubElement(body, "Doh_KDVP")
        KDVP = etree.SubElement(Doh_KDVP, "KDVP")
        etree.SubElement(KDVP, "DocumentWorkflowID").text = self.documentType.value
        etree.SubElement(KDVP, "Year").text = self.baseReportConfig.fromDate.format("YYYY")
        etree.SubElement(KDVP, "PeriodStart").text = self.baseReportConfig.fromDate.format("YYYY-MM-DD")
        etree.SubElement(KDVP, "PeriodEnd").text = self.baseReportConfig.toDate.shift(days=-1).format("YYYY-MM-DD")
        etree.SubElement(KDVP, "IsResident").text = str(self.taxPayerInfo.countryID == 'SI').lower()
        etree.SubElement(KDVP, "SecurityCount").text = "0"
        etree.SubElement(KDVP, "SecurityShortCount").text = "0"
        etree.SubElement(KDVP, "SecurityWithContractCount").text = "0"
        etree.SubElement(KDVP, "SecurityWithContractShortCount").text = "0"
        etree.SubElement(KDVP, "ShareCount").text = "0"
        # etree.SubElement(KDVP, "CountryOfResidenceID").text = self.taxPayerInfo.countryID
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
                        etree.SubElement(entry, "ResolutionDate").text = securityEntry.ResolutionDate.format('YYYY-MM-DD')

                    for id, entryLine in enumerate(securityEntry.Events):
                        row = etree.SubElement(entry, "Row")

                        etree.SubElement(row, "ID").text = str(id)

                        if isinstance(entryLine, ss.EDavkiTradeReportSecurityLineGenericEventBought):
                            purchase = etree.SubElement(row, "Purchase")
                            etree.SubElement(purchase, "F1").text = entryLine.BoughtOn.format('YYYY-MM-DD')
                            etree.SubElement(purchase, "F2").text = entryLine.GainType.value
                            etree.SubElement(purchase, "F3").text = str(entryLine.Quantity.__round__(5))
                            etree.SubElement(purchase, "F4").text = str(entryLine.PricePerUnit.__round__(5))
                            etree.SubElement(purchase, "F5").text = str(entryLine.InheritanceAndGiftTaxPaid.__round__(5) if entryLine.InheritanceAndGiftTaxPaid is not None else "0")
                            etree.SubElement(purchase, "F11").text = str(entryLine.BaseTaxReduction.__round__(5) if entryLine.BaseTaxReduction is not None else "0")

                        
                        if isinstance(entryLine, ss.EDavkiTradeReportSecurityLineGenericEventSold):
                            sale = etree.SubElement(row, "Sale")
                            etree.SubElement(sale, "F6").text = entryLine.SoldOn.format('YYYY-MM-DD')
                            etree.SubElement(sale, "F7").text = str(entryLine.Quantity.__round__(5))
                            etree.SubElement(sale, "F9").text = str(entryLine.PricePerUnit.__abs__().__round__(5))
                            etree.SubElement(sale, "F10").text = str(entryLine.SatisfiesTaxBasisReduction).lower()

        return envelope



    def generateDataFrameReport(self, data: Sequence[gf.UnderlyingGrouping]) -> pd.DataFrame:
        convertedTrades = self.convertTradesToKdvpItems(data)


        def getLinesFromData(entry: ss.EDavkiGenericTradeReportItem) -> list[pd.DataFrame]:
            
            def getLinesDataFromEvents(line: ss.EDavkiTradeReportSecurityLineEvent):
                lines = pd.DataFrame(line.Events)
                lines['ISIN'] = line.ISIN
                lines['Ticker'] = line.Code
                lines['HasForeignTax'] = entry.HasForeignTax
                lines['ForeignTax'] = entry.ForeignTax
                lines['ForeignTaxCountryID'] = entry.ForeignTransfer
                lines['ForeignTaxCountryName'] = entry.HasForeignTax

                return lines



            return list(map(getLinesDataFromEvents, entry.Items))

        mappedData = list(map(getLinesFromData, convertedTrades))
        flattenedData = [x for xn in mappedData for x in xn]

        combinedData = pd.concat(flattenedData)

        return combinedData
    




class EDavkiDerivativeReport(gr.GenericDerivativeReport[EDavkiReportConfig]):
    SECURITY_MAPPING : dict[gf.GenericDerivativeReportAssetClassType, ss.EDavkiDerivativeSecurityType] = {
        gf.GenericDerivativeReportAssetClassType.OPTION: ss.EDavkiDerivativeSecurityType.OPTION,
        gf.GenericDerivativeReportAssetClassType.FUTURES_CONTRACT: ss.EDavkiDerivativeSecurityType.FUTURES_CONTRACT,
        gf.GenericDerivativeReportAssetClassType.CONTRACT_FOR_DIFFERENCE: ss.EDavkiDerivativeSecurityType.CONTRACT_FOR_DIFFERENCE,
        gf.GenericDerivativeReportAssetClassType.CERTIFICATE: ss.EDavkiDerivativeSecurityType.CERTIFICATE,
        # gf.GenericDerivativeReportAssetClassType.OTHER: ss.EDavkiDerivativeReportItemType.DERIVATIVE_SHORT,
    }

    GAIN_MAPPINGS : dict[gf.GenericDerivativeReportItemGainType, ss.EDavkiDerivativeReportGainType] = {
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
        reportEndPeriod = int(self.baseReportConfig.toDate.shift(days = -1).format("YYYY"))
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

            securitySegmented: dict[gf.GenericDerivativeReportAssetClassType, list[gf.GenericDerivativeReportItem]] = {}
            for key, valuesiter in groupby(entries, key=lambda item: item.AssetClass):
                securitySegmented[key] = list(valuesiter)

            for securityType, securityLines in securitySegmented.items():

                for lots in securityLines:
                    def convertBuy(line: gf.GenericDerivativeReportItemSecurityLineBought) -> ss.EDavkiDerivativeReportSecurityLineGenericEventBought:
                        return ss.EDavkiDerivativeReportSecurityLineGenericEventBought(
                            BoughtOn = line.AcquiredDate,
                            GainType = self.GAIN_MAPPINGS[line.AcquiredHow],
                            Quantity = line.NumberOfUnits,
                            PricePerUnit = line.AmountPerUnit,
                            TotalPrice = line.TotalAmountPaid,
                            Leveraged = False
                        )

                    def convertSell(line: gf.GenericDerivativeReportItemSecurityLineSold) -> ss.EDavkiDerivativeReportSecurityLineGenericEventSold:
                        return ss.EDavkiDerivativeReportSecurityLineGenericEventSold(
                            SoldOn = line.SoldDate,
                            Quantity = line.NumberOfUnitsSold,
                            TotalPrice = line.TotalAmountSoldFor,
                            PricePerUnit = line.AmountPerUnit,
                            Leveraged = False
                        )
                    

                    periodStart = self.baseReportConfig.fromDate
                    periodEnd = self.baseReportConfig.toDate

                    buyLines: list[gf.GenericDerivativeReportItemSecurityLineBought] = list(filter(lambda line: isinstance(line, gf.GenericDerivativeReportItemSecurityLineBought), lots.Lines)) # type: ignore
                    sellLines: list[gf.GenericDerivativeReportItemSecurityLineSold] = list(filter(lambda line: isinstance(line, gf.GenericDerivativeReportItemSecurityLineSold), lots.Lines)) # type: ignore

                    buyLines = list(filter(lambda line: line.AcquiredDate >= periodStart and line.AcquiredDate < periodEnd, buyLines))
                    sellLines = list(filter(lambda line: line.SoldDate >= periodStart and line.SoldDate < periodEnd, sellLines))

                    buys = list(map(convertBuy, buyLines)) # type: ignore
                    sells = list(map(convertSell, sellLines)) # type: ignore

                    buysAndSells : list[ss.EDavkiDerivativeReportSecurityLineGenericEventBought | ss.EDavkiDerivativeReportSecurityLineGenericEventSold] = buys + sells


                    ForeignTaxPaid = sum(map(lambda entry: entry.ForeignTax or 0, entries))
                    HasForeignTax = True
                    if ForeignTaxPaid <= 0:
                        ForeignTaxPaid = None
                        HasForeignTax = False
                    
                    ISINEntry = ss.EDavkiGenericDerivativeReportItem(
                        InventoryListType = self.SECURITY_MAPPING[securityType],
                        ItemType = ss.EDavkiDerivativeReportItemType.DERIVATIVE,    # TODO: Actually check this for correct type
                        Code = None,
                        ISIN = ISIN,
                        Name = None,
                        HasForeignTax = HasForeignTax,
                        ForeignTax = ForeignTaxPaid,
                        FTCountryID = None,
                        FTCountryName = None,
                        Items = buysAndSells
                    )

                    converted.append(ISINEntry)



        return converted



    def generateDataFrameReport(self, data: list[gf.GenericDerivativeReportItem]) -> pd.DataFrame:
        convertedTrades = self.convertTradesToIfiItems(data)


        def getLinesFromData(entry: ss.EDavkiGenericDerivativeReportItem) -> pd.DataFrame:
            
            lines = pd.DataFrame(entry.Items)
            lines['ISIN'] = entry.ISIN
            lines['Ticker'] = entry.Code
            lines['HasForeignTax'] = entry.HasForeignTax
            lines['ForeignTax'] = entry.ForeignTax
            lines['ForeignTaxCountryID'] = entry.FTCountryID
            lines['ForeignTaxCountryName'] = entry.FTCountryName

            return lines

        mappedData = list(map(getLinesFromData, convertedTrades))

        combinedData = pd.concat(mappedData)

        return combinedData
    



    def generateXmlReport(self, data: list[gf.GenericDerivativeReportItem], templateEnvelope: etree.ElementBase) -> etree.ElementBase:
        convertedTrades = self.convertTradesToIfiItems(data)

        nsmap = templateEnvelope.nsmap
        nsmap[None] = "http://edavki.durs.si/Documents/Schemas/D_IFI_4.xsd"
        envelope = etree.Element(templateEnvelope.tag, attrib=templateEnvelope.attrib, nsmap=nsmap)
        envelope[:] = templateEnvelope[:]

        body = etree.SubElement(envelope, "body")
        etree.SubElement(body, etree.QName(nsmap['edp'], 'bodyContent'))

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
                    
                    if isinstance(entryLine, ss.EDavkiDerivativeReportSecurityLineGenericEventBought):
                        purchase = etree.SubElement(entry, "Purchase")
                        etree.SubElement(purchase, "F1").text = entryLine.BoughtOn.format('YYYY-MM-DD')
                        etree.SubElement(purchase, "F2").text = entryLine.GainType.value
                        etree.SubElement(purchase, "F3").text = str(entryLine.Quantity.__round__(8))
                        etree.SubElement(purchase, "F4").text = str(entryLine.PricePerUnit.__round__(8))
                        etree.SubElement(purchase, "F9").text = str(entryLine.Leveraged).lower()

                    
                    if isinstance(entryLine, ss.EDavkiDerivativeReportSecurityLineGenericEventSold):
                        sale = etree.SubElement(entry, "Sale")
                        etree.SubElement(sale, "F5").text = entryLine.SoldOn.format('YYYY-MM-DD')
                        etree.SubElement(sale, "F6").text = str(entryLine.Quantity.__round__(8))
                        etree.SubElement(sale, "F7").text = str(entryLine.PricePerUnit.__abs__().__round__(8))


        return envelope
