from typing import Any

from lxml import etree

import src.BrokerageExportProviders.Brokerages.IBKR.Schemas as s
import src.BrokerageExportProviders.Utils.ValueParsingUtils as utils


def deduplicateList(lines: list[list[Any]]):
    allRows = [x for xs in lines for x in xs]

    uniqueTransactionRows = list({row.TransactionID: row for row in allRows}.values())

    return uniqueTransactionRows


def parseNotes(notes: str) -> list[s.Codes]:
    notesAndCodes = notes.split(";")
    notesAndCodesParsed = list(map(lambda code: s.Codes(code), notesAndCodes)) if notes != "" else []
    return notesAndCodesParsed


def extractCorporateActions(node: etree.ElementBase) -> s.CorporateAction:
    notesAndCodesParsed = parseNotes(node.attrib["code"])

    corporateAction = s.CorporateAction(
        ClientAccountID=node.attrib["accountId"],
        AccountAlias=node.attrib["acctAlias"],
        Currency=node.attrib["currency"],
        Model=s.Model(node.attrib["model"]) if node.attrib["model"] != "" else None,
        FXRateToBase=float(node.attrib["fxRateToBase"]),
        AssetClass=s.AssetClass(node.attrib["assetCategory"]),
        SubCategory=s.SubCategory(node.attrib["subCategory"]),
        Symbol=node.attrib["symbol"],
        Description=node.attrib["description"],
        Conid=node.attrib["conid"],
        SecurityID=node.attrib["securityID"],
        SecurityIDType=s.SecurityIDType(node.attrib["securityIDType"]),
        CUSIP=utils.valueOrNone(node.attrib["cusip"]),
        ISIN=node.attrib["isin"],
        FIGI=node.attrib["figi"],
        ListingExchange=node.attrib["listingExchange"],
        UnderlyingConid=utils.valueOrNone(node.attrib["underlyingConid"]),
        UnderlyingSymbol=utils.valueOrNone(node.attrib["underlyingSymbol"]),
        UnderlyingSecurityID=utils.valueOrNone(node.attrib["underlyingSecurityID"]),
        UnderlyingListingExchange=utils.valueOrNone(node.attrib["underlyingListingExchange"]),
        Multiplier=float(node.attrib["multiplier"]),
        Strike=utils.floatValueOrNone(node.attrib["strike"]),
        Expiry=(utils.safeDateParse(node.attrib["expiry"]) if node.attrib["expiry"] != "" else None),
        PutOrCall=(
            s.PutOrCall(utils.valueOrNone(node.attrib["putCall"])) if utils.valueOrNone(node.attrib["putCall"]) is not None else None
        ),
        PrincipalAdjustFactor=utils.floatValueOrNone(node.attrib["principalAdjustFactor"]),
        ReportDate=utils.safeDateParse(node.attrib["reportDate"]),
        DateTime=utils.safeDateParse(node.attrib["dateTime"]),
        ActionDescription=node.attrib["actionDescription"],
        Amount=float(node.attrib["amount"]),
        Proceeds=float(node.attrib["proceeds"]),
        Value=float(node.attrib["value"]),
        Quantity=float(node.attrib["quantity"]),
        FifoProfitAndLossRealized=float(node.attrib["fifoPnlRealized"]),
        CapitalGainsProfitAndLoss=float(node.attrib["capitalGainsPnl"]),
        ForexProfitAndLoss=float(node.attrib["fxPnl"]),
        MarketToMarketProfitAndLoss=float(node.attrib["mtmPnl"]),
        NotesAndCodes=notesAndCodesParsed,
        Type=node.attrib["type"],
        TransactionID=node.attrib["transactionID"],
        ActionID=node.attrib["actionID"],
        LevelOfDetail=s.LevelOfDetail(node.attrib["levelOfDetail"]),
        SerialNumber=utils.valueOrNone(node.attrib["serialNumber"]),
        DeliveryType=utils.valueOrNone(node.attrib["deliveryType"]),
        CommodityType=utils.valueOrNone(node.attrib["commodityType"]),
        Fineness=float(node.attrib["fineness"]),
        Weight=float(node.attrib["weight"]),
    )

    return corporateAction


def extractStockTrade(node: etree.ElementBase) -> s.TradeStock:
    notesAndCodesParsed = parseNotes(node.attrib["notes"])

    trade = s.TradeStock(
        ClientAccountID=node.attrib["accountId"],
        Currency=node.attrib["currency"],
        FXRateToBase=float(node.attrib["fxRateToBase"]),
        AssetClass=s.AssetClass(node.attrib["assetCategory"]),
        SubCategory=s.SubCategory(node.attrib["subCategory"]),
        Symbol=node.attrib["symbol"],
        Description=node.attrib["description"],
        Conid=node.attrib["conid"],
        SecurityID=node.attrib["securityID"],
        SecurityIDType=s.SecurityIDType(node.attrib["securityIDType"]),
        CUSIP=utils.valueOrNone(node.attrib["cusip"]),
        ISIN=node.attrib["isin"],
        FIGI=node.attrib["figi"],
        ListingExchange=node.attrib["listingExchange"],
        ReportDate=utils.safeDateParse(node.attrib["reportDate"]),
        DateTime=utils.safeDateParse(node.attrib["dateTime"]),
        TradeDate=utils.safeDateParse(node.attrib["tradeDate"]),
        TransactionType=s.TransactionType(node.attrib["transactionType"]),
        Exchange=node.attrib["exchange"],
        Quantity=float(node.attrib["quantity"]),
        TradePrice=float(node.attrib["tradePrice"]),
        TradeMoney=float(node.attrib["tradeMoney"]),
        Proceeds=float(node.attrib["proceeds"]),
        Taxes=float(node.attrib["taxes"]),
        IBCommission=float(node.attrib["ibCommission"]),
        IBCommissionCurrency=node.attrib["ibCommissionCurrency"],
        NetCash=float(node.attrib["netCash"]),
        NetCashInBase=float(node.attrib["netCashInBase"]),
        ClosePrice=float(node.attrib["closePrice"]),
        OpenCloseIndicator=s.OpenCloseIndicator(node.attrib["openCloseIndicator"]),
        NotesAndCodes=notesAndCodesParsed,
        CostBasis=float(node.attrib["cost"]),
        FifoProfitAndLossRealized=float(node.attrib["fifoPnlRealized"]),
        CapitalGainsProfitAndLoss=float(node.attrib["capitalGainsPnl"]),
        ForexProfitAndLoss=float(node.attrib["fxPnl"]),
        MarketToMarketProfitAndLoss=float(node.attrib["mtmPnl"]),
        BuyOrSell=s.BuyOrSell(node.attrib["buySell"]),
        TransactionID=node.attrib["transactionID"],
        OrderTime=utils.safeDateParse(node.attrib["orderTime"]),
        LevelOfDetail=s.LevelOfDetail(node.attrib["levelOfDetail"]),
        ChangeInPrice=float(node.attrib["changeInPrice"]),
        ChangeInQuantity=float(node.attrib["changeInQuantity"]),
        OrderType=s.OrderType(node.attrib["orderType"]),
        AccruedInterest=float(node.attrib["accruedInt"]),
    )
    return trade


def extractStockLot(node: etree.ElementBase) -> s.LotStock:
    notesAndCodesParsed = parseNotes(node.attrib["notes"])

    trade = s.LotStock(
        ClientAccountID=node.attrib["accountId"],
        Currency=node.attrib["currency"],
        FXRateToBase=float(node.attrib["fxRateToBase"]),
        AssetClass=s.AssetClass(node.attrib["assetCategory"]),
        SubCategory=s.SubCategory(node.attrib["subCategory"]),
        Symbol=node.attrib["symbol"],
        Description=node.attrib["description"],
        Conid=node.attrib["conid"],
        SecurityID=node.attrib["securityID"],
        SecurityIDType=s.SecurityIDType(node.attrib["securityIDType"]),
        CUSIP=utils.valueOrNone(node.attrib["cusip"]),
        ISIN=node.attrib["isin"],
        FIGI=node.attrib["figi"],
        ListingExchange=node.attrib["listingExchange"],
        Multiplier=float(node.attrib["multiplier"]),
        ReportDate=utils.safeDateParse(node.attrib["reportDate"]),
        DateTime=utils.safeDateParse(node.attrib["dateTime"]),
        TradeDate=utils.safeDateParse(node.attrib["tradeDate"]),
        Exchange=node.attrib["exchange"],
        Quantity=float(node.attrib["quantity"]),
        TradePrice=float(node.attrib["tradePrice"]),
        OpenCloseIndicator=s.OpenCloseIndicator(node.attrib["openCloseIndicator"]),
        NotesAndCodes=notesAndCodesParsed,
        CostBasis=float(node.attrib["cost"]),
        FifoProfitAndLossRealized=float(node.attrib["fifoPnlRealized"]),
        CapitalGainsProfitAndLoss=float(node.attrib["capitalGainsPnl"]),
        ForexProfitAndLoss=float(node.attrib["fxPnl"]),
        BuyOrSell=s.BuyOrSell(node.attrib["buySell"]),
        TransactionID=node.attrib["transactionID"],
        OpenDateTime=utils.safeDateParse(node.attrib["openDateTime"]),
        HoldingPeriodDateTime=utils.safeDateParse(node.attrib["holdingPeriodDateTime"]),
        LevelOfDetail=s.LevelOfDetail(node.attrib["levelOfDetail"]),
    )
    return trade


def extractOptionTrade(node: etree.ElementBase) -> s.TradeDerivative:
    notesAndCodesParsed = parseNotes(node.attrib["notes"])

    trade = s.TradeDerivative(
        ClientAccountID=node.attrib["accountId"],
        Currency=node.attrib["currency"],
        FXRateToBase=float(node.attrib["fxRateToBase"]),
        AssetClass=s.AssetClass(node.attrib["assetCategory"]),
        SubCategory=s.SubCategory(node.attrib["subCategory"]),
        Symbol=node.attrib["symbol"],
        Description=node.attrib["description"],
        Conid=node.attrib["conid"],
        FIGI=node.attrib["figi"],
        ListingExchange=node.attrib["listingExchange"],
        UnderlyingConid=node.attrib["underlyingConid"],
        UnderlyingSymbol=node.attrib["underlyingSymbol"],
        UnderlyingSecurityID=node.attrib["underlyingSecurityID"],
        UnderlyingListingExchange=node.attrib["underlyingListingExchange"],
        TradeID=node.attrib["tradeID"],
        Multiplier=float(node.attrib["multiplier"]),
        Strike=float(node.attrib["strike"]),
        ReportDate=utils.safeDateParse(node.attrib["reportDate"]),
        Expiry=utils.safeDateParse(node.attrib["expiry"]),
        DateTime=utils.safeDateParse(node.attrib["dateTime"]),
        PutOrCall=s.PutOrCall(node.attrib["putCall"]),
        TradeDate=utils.safeDateParse(node.attrib["tradeDate"]),
        SettleDateTarget=utils.safeDateParse(node.attrib["settleDateTarget"]),
        TransactionType=s.TransactionType(node.attrib["transactionType"]),
        Exchange=node.attrib["exchange"],
        Quantity=float(node.attrib["quantity"]),
        TradePrice=float(node.attrib["tradePrice"]),
        TradeMoney=float(node.attrib["tradeMoney"]),
        Proceeds=float(node.attrib["proceeds"]),
        Taxes=float(node.attrib["taxes"]),
        IBCommission=float(node.attrib["ibCommission"]),
        IBCommissionCurrency=node.attrib["ibCommissionCurrency"],
        NetCash=float(node.attrib["netCash"]),
        NetCashInBase=float(node.attrib["netCashInBase"]),
        ClosePrice=float(node.attrib["closePrice"]),
        OpenCloseIndicator=s.OpenCloseIndicator(node.attrib["openCloseIndicator"]),
        NotesAndCodes=notesAndCodesParsed,
        CostBasis=float(node.attrib["cost"]),
        FifoProfitAndLossRealized=float(node.attrib["fifoPnlRealized"]),
        CapitalGainsProfitAndLoss=float(node.attrib["capitalGainsPnl"]),
        ForexProfitAndLoss=float(node.attrib["fxPnl"]),
        MarketToMarketProfitAndLoss=float(node.attrib["mtmPnl"]),
        BuyOrSell=s.BuyOrSell(node.attrib["buySell"]),
        TransactionID=node.attrib["transactionID"],
        OrderTime=utils.safeDateParse(node.attrib["orderTime"]),
        LevelOfDetail=s.LevelOfDetail(node.attrib["levelOfDetail"]),
        OrderType=s.OrderType(node.attrib["orderType"]),
    )
    return trade


def extractOptionLot(node: etree.ElementBase) -> s.LotDerivative:
    notesAndCodesParsed = parseNotes(node.attrib["notes"])

    trade = s.LotDerivative(
        ClientAccountID=node.attrib["accountId"],
        Currency=node.attrib["currency"],
        FXRateToBase=float(node.attrib["fxRateToBase"]),
        AssetClass=s.AssetClass(node.attrib["assetCategory"]),
        SubCategory=s.SubCategory(node.attrib["subCategory"]),
        Symbol=node.attrib["symbol"],
        Description=node.attrib["description"],
        Conid=node.attrib["conid"],
        FIGI=node.attrib["figi"],
        ListingExchange=node.attrib["listingExchange"],
        UnderlyingConid=node.attrib["underlyingConid"],
        UnderlyingSymbol=node.attrib["underlyingSymbol"],
        UnderlyingSecurityID=node.attrib["underlyingSecurityID"],
        UnderlyingListingExchange=node.attrib["underlyingListingExchange"],
        Multiplier=float(node.attrib["multiplier"]),
        Strike=float(node.attrib["strike"]),
        ReportDate=utils.safeDateParse(node.attrib["reportDate"]),
        Expiry=utils.safeDateParse(node.attrib["expiry"]),
        DateTime=utils.safeDateParse(node.attrib["dateTime"]),
        PutOrCall=s.PutOrCall(node.attrib["putCall"]),
        TradeDate=utils.safeDateParse(node.attrib["tradeDate"]),
        Exchange=node.attrib["exchange"],
        Quantity=float(node.attrib["quantity"]),
        TradePrice=float(node.attrib["tradePrice"]),
        OpenCloseIndicator=s.OpenCloseIndicator(node.attrib["openCloseIndicator"]),
        NotesAndCodes=notesAndCodesParsed,
        CostBasis=float(node.attrib["cost"]),
        FifoProfitAndLossRealized=float(node.attrib["fifoPnlRealized"]),
        CapitalGainsProfitAndLoss=float(node.attrib["capitalGainsPnl"]),
        ForexProfitAndLoss=float(node.attrib["fxPnl"]),
        BuyOrSell=s.BuyOrSell(node.attrib["buySell"]),
        TransactionID=node.attrib["transactionID"],
        OpenDateTime=utils.safeDateParse(node.attrib["openDateTime"]),
        HoldingPeriodDateTime=utils.safeDateParse(node.attrib["holdingPeriodDateTime"]),
        LevelOfDetail=s.LevelOfDetail(node.attrib["levelOfDetail"]),
    )
    return trade


def extractCashTransaction(node: etree.ElementBase) -> s.TransactionCash:
    trade = s.TransactionCash(
        ClientAccountID=node.attrib["accountId"],
        Currency=node.attrib["currency"],
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
        DateTime=utils.safeDateParse(str(node.attrib["dateTime"])),
        SettleDate=utils.safeDateParse(str(node.attrib["settleDate"])),
        Amount=float(node.attrib["amount"]),
        Type=s.CashTransactionType(node.attrib["type"]),
        Code=node.attrib["code"],
        TransactionID=node.attrib["transactionID"],
        ReportDate=utils.safeDateParse(str(node.attrib["reportDate"])),
        ActionID=node.attrib["actionID"],
    )
    return trade


def extractFromXML(root: etree._Element) -> s.SegmentedTrades:
    # cashTradesFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Trade[@assetCategory='{}']".format(s.AssetClass.CASH.value))
    # cashTradeNodes = cashTradesFinder(root)
    cashTransactionsFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/CashTransactions/*")
    cashTransactionNodes = cashTransactionsFinder(root)

    corporateActionsFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/CorporateActions/*")
    corporateActionsNodes = corporateActionsFinder(root)

    optionTradesFinder = etree.XPath(
        "/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Trade[@assetCategory='{}']".format(s.AssetClass.OPTION.value)
    )
    optionLotsFinder = etree.XPath(
        "/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Lot[@assetCategory='{}']".format(s.AssetClass.OPTION.value)
    )
    optionTradeNodes = optionTradesFinder(root)
    optionLotNodes = optionLotsFinder(root)

    stockTradesFinder = etree.XPath(
        "/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Trade[@assetCategory='{}']".format(s.AssetClass.STOCK.value)
    )
    stockLotsFinder = etree.XPath(
        "/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Lot[@assetCategory='{}']".format(s.AssetClass.STOCK.value)
    )
    stockTradeNodes = stockTradesFinder(root)
    stockLotNodes = stockLotsFinder(root)

    # cashTrades = list(map(extractCashTrade, cashTradeNodes))
    cashTransactions = list(map(extractCashTransaction, cashTransactionNodes))

    corporateActions = list(map(extractCorporateActions, corporateActionsNodes))

    stockTrades = list(map(extractStockTrade, stockTradeNodes))
    stockLots = list(map(extractStockLot, stockLotNodes))

    optionTrades = list(map(extractOptionTrade, optionTradeNodes))
    optionLots = list(map(extractOptionLot, optionLotNodes))

    return s.SegmentedTrades(
        # cashTrades = cashTrades,
        cashTransactions=cashTransactions,
        corporateActions=corporateActions,
        stockTrades=stockTrades,
        stockLots=stockLots,
        derivativeTrades=optionTrades,
        derivativeLots=optionLots,
    )


def mergeTrades(trades: list[s.SegmentedTrades]) -> s.SegmentedTrades:
    stockTrades = list(map(lambda trade: trade.stockTrades, trades))
    optionTrades = list(map(lambda trade: trade.derivativeTrades, trades))
    # cashTrades = list(map(lambda trade: trade.cashTrades, trades))
    cashTransactions = list(map(lambda trade: trade.cashTransactions, trades))
    corporateActions = list(map(lambda trade: trade.corporateActions, trades))

    stockLots = list(map(lambda trade: trade.stockLots, trades))
    optionLots = list(map(lambda trade: trade.derivativeLots, trades))

    stockTrades = deduplicateList(stockTrades)
    corporateActions = deduplicateList(corporateActions)
    # cashTrades = deduplicateList(cashTrades)
    optionTrades = deduplicateList(optionTrades)
    cashTransactions = deduplicateList(cashTransactions)

    optionLots = [x for xs in optionLots for x in xs]  # lots cannot be deduplicated, as there is no unique identifer
    stockLots = [x for xs in stockLots for x in xs]  # lots cannot be deduplicated, as there is no unique identifer

    return s.SegmentedTrades(
        # cashTrades = cashTrades,
        cashTransactions=cashTransactions,
        stockTrades=stockTrades,
        corporateActions=corporateActions,
        stockLots=stockLots,
        derivativeTrades=optionTrades,
        derivativeLots=optionLots,
    )
