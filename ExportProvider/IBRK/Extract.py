from lxml import etree
import ExportProvider.IBRK.Schemas as s
import arrow


def safeDateParse(dateString: str) -> arrow.Arrow:
     safeDateString = dateString.replace('EDT', 'US/Eastern').replace('EST', 'US/Eastern')
     return arrow.get(safeDateString, ['YYYY-MM-DD HH:mm:ss ZZZ', 'YYYY-MM-DD;HH:mm:ss ZZZ', 'YYYY-MM-DD'])

def valueOrNone(value: str) -> str | None:
    if value == "":
         return None
    return value

def floatValueOrNone(value: str) -> float | None:
    if value == "":
         return None
    return float(value)

def dateValueOrNone(value: str) -> arrow.Arrow | None:
    if value == "":
         return None
    return safeDateParse(value)


def extractCashTransactionFromXML(root: etree.ElementBase) -> list[s.CashTransaction]:
    cashTransactionsFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/CashTransactions/*")
    cashTransactionNodes = cashTransactionsFinder(root)

    def xmlNodeToCashTransaction(node: etree.ElementBase):
        return s.CashTransaction(
            ClientAccountID=node.attrib["accountId"],
            AccountAlias=node.attrib["acctAlias"],
            Model=s.Model[node.attrib["model"]] if node.attrib["model"] != "" else None,
            CurrencyPrimary=node.attrib["currency"],
            FXRateToBase=float(node.attrib["fxRateToBase"]),
            AssetClass=s.AssetClass(node.attrib["assetCategory"]),
            SubCategory=s.SubCategory(node.attrib["subCategory"]),
            Symbol=node.attrib["symbol"],
            Description=node.attrib["description"],
            Conid=node.attrib["conid"],
            SecurityID=node.attrib["securityID"],
            SecurityIDType=s.SecurityIDType(node.attrib["securityIDType"]),
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
            DateTime=safeDateParse(str(node.attrib["dateTime"])),
            SettleDate=safeDateParse(str(node.attrib["settleDate"])),
            Amount=float(node.attrib["amount"]),
            Type=s.CashTransactionType(node.attrib["type"]),
            TradeID=node.attrib["settleDate"],
            Code=node.attrib["code"],
            TransactionID=node.attrib["transactionID"],
            ReportDate=safeDateParse(str(node.attrib["reportDate"])),
            ClientReference=node.attrib["clientReference"],
            ActionID=node.attrib["actionID"],
            LevelOfDetail=s.LevelOfDetail(node.attrib["levelOfDetail"]),
            SerialNumber=node.attrib["serialNumber"],
            DeliveryType=node.attrib["deliveryType"],
            CommodityType=node.attrib["commodityType"],
            Fineness=float(node.attrib["fineness"]),
            Weight=float(node.attrib["weight"])
        )

    return list(map(lambda node: xmlNodeToCashTransaction(node), cashTransactionNodes))

def mergeCashTransactions(transactions: list[list[s.CashTransaction]]) -> list[s.CashTransaction]:
        allRows = [x for xs in transactions for x in xs]

        uniqueTransactionRows = list({row.TransactionID: row for row in allRows}.values())

        return uniqueTransactionRows




def extractTradesFromXML(root: etree.ElementBase) -> s.SegmentedTrades:
    openTradesFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Trade")
    closeTradesFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Lot")

    openTradeNodes = openTradesFinder(root)
    closeTradeNodes = closeTradesFinder(root)

    def xmlNodeToOpenTrade(node: etree.ElementBase) -> s.Trade:
        notesAndCodes = str(node.attrib['notes']).split(";")
        notesAndCodesParsed = list(map(lambda code: s.Codes(code), notesAndCodes)) if node.attrib['notes'] != "" else []

        return s.Trade(
                ClientAccountID = node.attrib['accountId'],
                AccountAlias = valueOrNone(node.attrib['acctAlias']),
                Model = s.Model(node.attrib['model']) if node.attrib['model'] != "" else None,
                CurrencyPrimary = node.attrib['currency'],
                FXRateToBase = node.attrib['fxRateToBase'],
                AssetClass = s.AssetClass(node.attrib['assetCategory']),
                SubCategory = s.SubCategory(node.attrib['subCategory']),
                Symbol = node.attrib['symbol'],
                Description = node.attrib['description'],
                Conid = node.attrib['conid'],
                SecurityID = node.attrib['securityID'],
                SecurityIDType = s.SecurityIDType(node.attrib['securityIDType']),
                CUSIP = valueOrNone(node.attrib['cusip']),
                ISIN = node.attrib['isin'],
                FIGI = node.attrib['figi'],
                ListingExchange = node.attrib['listingExchange'],
                UnderlyingConid = valueOrNone(node.attrib['underlyingConid']),
                UnderlyingSymbol = valueOrNone(node.attrib['underlyingSymbol']),
                UnderlyingSecurityID = valueOrNone(node.attrib['underlyingSecurityID']),
                UnderlyingListingExchange = valueOrNone(node.attrib['underlyingListingExchange']),
                Issuer = valueOrNone(node.attrib['issuer']),
                IssuerCountryCode = valueOrNone(node.attrib['issuerCountryCode']),
                TradeID = node.attrib['tradeID'],
                Multiplier = float(node.attrib['multiplier']),
                RelatedTradeID = node.attrib['relatedTradeID'],
                Strike = float(node.attrib['strike']) if node.attrib['strike'] != "" else None,
                ReportDate = safeDateParse(node.attrib['reportDate']),
                Expiry = safeDateParse(node.attrib['expiry']) if node.attrib['expiry'] != "" else None,
                DateTime = safeDateParse(node.attrib['dateTime']),
                PutOrCall = valueOrNone(node.attrib['putCall']),
                TradeDate = safeDateParse(node.attrib['tradeDate']),
                PrincipalAdjustFactor = floatValueOrNone(node.attrib['principalAdjustFactor']),
                SettleDateTarget = safeDateParse(node.attrib['settleDateTarget']),
                TransactionType = s.TransactionType(node.attrib['transactionType']),
                Exchange = valueOrNone(node.attrib['exchange']),
                Quantity = float(node.attrib['quantity']),
                TradePrice = float(node.attrib['tradePrice']),
                TradeMoney = float(node.attrib['tradeMoney']),
                Proceeds = float(node.attrib['proceeds']),
                Taxes = float(node.attrib['taxes']),
                IBCommission = float(node.attrib['ibCommission']),
                IBCommissionCurrency = node.attrib['ibCommissionCurrency'],
                NetCash = float(node.attrib['netCash']),
                NetCashInBase = float(node.attrib['netCashInBase']),
                ClosePrice = float(node.attrib['closePrice']),
                OpenCloseIndicator = s.OpenCloseIndicator(node.attrib['openCloseIndicator']),
                NotesAndCodes = notesAndCodesParsed,
                CostBasis = float(node.attrib['cost']),
                FifoProfitAndLossRealized = float(node.attrib['fifoPnlRealized']),
                CapitalGainsProfitAndLoss = float(node.attrib['capitalGainsPnl']),
                ForexProfitAndLoss = float(node.attrib['fxPnl']),
                MarketToMarketProfitAndLoss = float(node.attrib['mtmPnl']),
                OrigTradePrice = float(node.attrib['origTradePrice']),
                OrigTradeDate = dateValueOrNone(node.attrib['origTradeDate']),
                OrigTradeID = valueOrNone(node.attrib['origTradeID']),
                OrigOrderID = node.attrib['origOrderID'],
                OrigTransactionID = node.attrib['origTransactionID'],
                BuyOrSell = s.BuyOrSell(node.attrib['buySell']),
                ClearingFirmID = valueOrNone(node.attrib['clearingFirmID']),
                IBOrderID = node.attrib['ibOrderID'],
                TransactionID = node.attrib['transactionID'],
                IBExecID = node.attrib['ibExecID'],
                RelatedTransactionID = valueOrNone(node.attrib['relatedTransactionID']),
                BrokerageOrderID = node.attrib['brokerageOrderID'],
                OrderReference = valueOrNone(node.attrib['orderReference']),
                VolatilityOrderLink = valueOrNone(node.attrib['volatilityOrderLink']),
                ExchOrderID = node.attrib['exchOrderId'] if node.attrib['exchOrderId'] != "N/A" else None,
                ExtExecID = node.attrib['extExecID'],
                OrderTime = safeDateParse(node.attrib['orderTime']),
                OpenDateTime = dateValueOrNone(node.attrib['openDateTime']),
                HoldingPeriodDateTime = dateValueOrNone(node.attrib['holdingPeriodDateTime']),
                WhenRealized = dateValueOrNone(node.attrib['whenRealized']),
                WhenReopened = dateValueOrNone(node.attrib['whenReopened']),
                LevelOfDetail = s.LevelOfDetail(node.attrib['levelOfDetail']),
                ChangeInPrice = float(node.attrib['changeInPrice']),
                ChangeInQuantity = float(node.attrib['changeInQuantity']),
                OrderType = s.OrderType(node.attrib['orderType']),
                TraderID = valueOrNone(node.attrib['traderID']),
                IsAPIOrder = str(node.attrib['traderID']).lower() == 'y',
                AccruedInterest = float(node.attrib['accruedInt']),
                SerialNumber = valueOrNone(node.attrib['serialNumber']),
                DeliveryType = valueOrNone(node.attrib['deliveryType']),
                CommodityType = valueOrNone(node.attrib['commodityType']),
                Fineness = float(node.attrib['fineness']),
                Weight = float(node.attrib['weight'])
          )

    def xmlNodeToLotTrade(node: etree.ElementBase) -> s.TradeLot:
        notesAndCodes = str(node.attrib['notes']).split(";")
        notesAndCodesParsed = list(map(lambda code: s.Codes(code), notesAndCodes))  if node.attrib['notes'] != "" else []

        return s.TradeLot(
                ClientAccountID = node.attrib['accountId'],
                AccountAlias = valueOrNone(node.attrib['acctAlias']),
                Model = s.Model(node.attrib['model']) if node.attrib['model'] != "" else None,
                CurrencyPrimary = node.attrib['currency'],
                FXRateToBase = node.attrib['fxRateToBase'],
                AssetClass = s.AssetClass(node.attrib['assetCategory']),
                SubCategory = s.SubCategory(node.attrib['subCategory']),
                Symbol = node.attrib['symbol'],
                Description = node.attrib['description'],
                Conid = node.attrib['conid'],
                SecurityID = node.attrib['securityID'],
                SecurityIDType = s.SecurityIDType(node.attrib['securityIDType']),
                CUSIP = valueOrNone(node.attrib['cusip']),
                ISIN = node.attrib['isin'],
                FIGI = node.attrib['figi'],
                ListingExchange = node.attrib['listingExchange'],
                UnderlyingConid = valueOrNone(node.attrib['underlyingConid']),
                UnderlyingSymbol = valueOrNone(node.attrib['underlyingSymbol']),
                UnderlyingSecurityID = valueOrNone(node.attrib['underlyingSecurityID']),
                UnderlyingListingExchange = valueOrNone(node.attrib['underlyingListingExchange']),
                Issuer = valueOrNone(node.attrib['issuer']),
                IssuerCountryCode = valueOrNone(node.attrib['issuerCountryCode']),
                TradeID = valueOrNone(node.attrib['tradeID']),
                Multiplier = float(node.attrib['multiplier']),
                RelatedTradeID = node.attrib['relatedTradeID'],
                Strike = floatValueOrNone(node.attrib['strike']),
                ReportDate = safeDateParse(node.attrib['reportDate']),
                Expiry = dateValueOrNone(node.attrib['expiry']),
                DateTime = safeDateParse(node.attrib['dateTime']),
                PutOrCall = valueOrNone(node.attrib['putCall']),
                TradeDate = safeDateParse(node.attrib['tradeDate']),
                PrincipalAdjustFactor = floatValueOrNone(node.attrib['principalAdjustFactor']),
                SettleDateTarget = dateValueOrNone(node.attrib['settleDateTarget']),
                TransactionType = s.TransactionType(node.attrib['transactionType']) if node.attrib['transactionType'] != "" else None,
                Exchange = valueOrNone(node.attrib['exchange']),
                Quantity = float(node.attrib['quantity']),
                TradePrice = float(node.attrib['tradePrice']),
                TradeMoney = floatValueOrNone(node.attrib['tradeMoney']),
                Proceeds = floatValueOrNone(node.attrib['proceeds']),
                Taxes = floatValueOrNone(node.attrib['taxes']),
                IBCommission = floatValueOrNone(node.attrib['ibCommission']),
                IBCommissionCurrency = valueOrNone(node.attrib['ibCommissionCurrency']),
                NetCash = floatValueOrNone(node.attrib['netCash']),
                NetCashInBase = floatValueOrNone(node.attrib['netCashInBase']),
                ClosePrice = floatValueOrNone(node.attrib['closePrice']),
                OpenCloseIndicator = s.OpenCloseIndicator(node.attrib['openCloseIndicator']),
                NotesAndCodes = notesAndCodesParsed,
                CostBasis = float(node.attrib['cost']),
                FifoProfitAndLossRealized = float(node.attrib['fifoPnlRealized']),
                CapitalGainsProfitAndLoss = float(node.attrib['capitalGainsPnl']),
                ForexProfitAndLoss = float(node.attrib['fxPnl']),
                MarketToMarketProfitAndLoss = floatValueOrNone(node.attrib['mtmPnl']),
                OrigTradePrice = floatValueOrNone(node.attrib['origTradePrice']),
                OrigTradeDate = dateValueOrNone(node.attrib['origTradeDate']),
                OrigTradeID = valueOrNone(node.attrib['origTradeID']),
                OrigOrderID = valueOrNone(node.attrib['origOrderID']),
                OrigTransactionID = valueOrNone(node.attrib['origTransactionID']),
                BuyOrSell = s.BuyOrSell(node.attrib['buySell']),
                ClearingFirmID = valueOrNone(node.attrib['clearingFirmID']),
                IBOrderID = valueOrNone(node.attrib['ibOrderID']),
                TransactionID = node.attrib['transactionID'],
                IBExecID = valueOrNone(node.attrib['ibExecID']),
                RelatedTransactionID = valueOrNone(node.attrib['relatedTransactionID']),
                BrokerageOrderID = valueOrNone(node.attrib['brokerageOrderID']),
                OrderReference = valueOrNone(node.attrib['orderReference']),
                VolatilityOrderLink = valueOrNone(node.attrib['volatilityOrderLink']),
                ExchOrderID = node.attrib['exchOrderId'] if node.attrib['exchOrderId'] != "N/A" else None,
                ExtExecID = valueOrNone(node.attrib['extExecID']),
                OrderTime = dateValueOrNone(node.attrib['orderTime']),
                OpenDateTime = safeDateParse(node.attrib['openDateTime']),
                HoldingPeriodDateTime = safeDateParse(node.attrib['holdingPeriodDateTime']),
                WhenRealized = dateValueOrNone(node.attrib['whenRealized']),
                WhenReopened = dateValueOrNone(node.attrib['whenReopened']),
                LevelOfDetail = s.LevelOfDetail(node.attrib['levelOfDetail']),
                ChangeInPrice = floatValueOrNone(node.attrib['changeInPrice']),
                ChangeInQuantity = floatValueOrNone(node.attrib['changeInQuantity']),
                OrderType = s.OrderType(node.attrib['orderType']) if node.attrib['orderType'] != "" else None,
                TraderID = valueOrNone(node.attrib['traderID']),
                IsAPIOrder = str(node.attrib['traderID']).lower() == 'y' if node.attrib['traderID'] != "" else None,
                AccruedInterest = floatValueOrNone(node.attrib['accruedInt']),
                SerialNumber = valueOrNone(node.attrib['serialNumber']),
                DeliveryType = valueOrNone(node.attrib['deliveryType']),
                CommodityType = valueOrNone(node.attrib['commodityType']),
                Fineness = float(node.attrib['fineness']),
                Weight = float(node.attrib['weight'])
          )


    openTrades = list(map(xmlNodeToOpenTrade, openTradeNodes))
    closeTrades = list(map(xmlNodeToLotTrade, closeTradeNodes))

    return s.SegmentedTrades(
         trades = openTrades,
         lots = closeTrades
    )