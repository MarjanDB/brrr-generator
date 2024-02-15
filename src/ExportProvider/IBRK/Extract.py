from lxml import etree
import src.ExportProvider.IBRK.Schemas as s
import arrow
from typing import Any


def safeDateParse(dateString: str) -> arrow.Arrow:
     safeDateString = dateString.replace('EDT', 'UTC-4').replace('EST', 'UTC-5')
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

def deduplicateList(lines: list[list[Any]]):
    allRows = [x for xs in lines for x in xs]

    uniqueTransactionRows = list({row.TransactionID: row for row in allRows}.values())

    return uniqueTransactionRows

def parseNotes(notes: str) -> list[s.Codes]:
    notesAndCodes = str().split(";")
    notesAndCodesParsed = list(map(lambda code: s.Codes(code), notesAndCodes)) if node.attrib['notes'] != "" else []
    return notesAndCodesParsed



def extractStockTrade(node: etree.ElementBase) -> s.TradeStock:
    notesAndCodesParsed = parseNotes(node.attrib['notes'])
    
    trade = s.TradeStock(
        ClientAccountID = node.attrib['accountId'],
        CurrencyPrimary = node.attrib['currency'],
        FXRateToBase = float(node.attrib['fxRateToBase']),
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
        ReportDate = safeDateParse(node.attrib['reportDate']),
        DateTime = safeDateParse(node.attrib['dateTime']),
        TradeDate = safeDateParse(node.attrib['tradeDate']),
        TransactionType = s.TransactionType(node.attrib['transactionType']),
        Exchange = node.attrib['exchange'],
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
        BuyOrSell = s.BuyOrSell(node.attrib['buySell']),
        TransactionID = node.attrib['transactionID'],
        OrderTime = safeDateParse(node.attrib['orderTime']),
        LevelOfDetail = s.LevelOfDetail(node.attrib['levelOfDetail']),
        ChangeInPrice = float(node.attrib['changeInPrice']),
        ChangeInQuantity = float(node.attrib['changeInQuantity']),
        OrderType = s.OrderType(node.attrib['orderType']),
        AccruedInterest = float(node.attrib['accruedInt'])
    )
    return trade



def extractStockLot(node: etree.ElementBase) -> s.LotStock:
    notesAndCodesParsed = parseNotes(node.attrib['notes'])
    
    trade = s.LotStock(
        ClientAccountID = node.attrib['accountId'],
        CurrencyPrimary = node.attrib['currency'],
        FXRateToBase = float(node.attrib['fxRateToBase']),
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
        Multiplier = float(node.attrib['multiplier']),
        ReportDate = safeDateParse(node.attrib['reportDate']),
        DateTime = safeDateParse(node.attrib['dateTime']),
        TradeDate = safeDateParse(node.attrib['tradeDate']),
        Exchange = node.attrib['exchange'],
        Quantity = float(node.attrib['quantity']),
        TradePrice = float(node.attrib['tradePrice']),
        OpenCloseIndicator = s.OpenCloseIndicator(node.attrib['openCloseIndicator']),
        NotesAndCodes = notesAndCodesParsed,
        CostBasis = float(node.attrib['cost']),
        FifoProfitAndLossRealized = float(node.attrib['fifoPnlRealized']),
        CapitalGainsProfitAndLoss = float(node.attrib['capitalGainsPnl']),
        ForexProfitAndLoss = float(node.attrib['fxPnl']),
        BuyOrSell = s.BuyOrSell(node.attrib['buySell']),
        TransactionID = node.attrib['transactionID'],
        OpenDateTime = safeDateParse(node.attrib['openDateTime']),
        HoldingPeriodDateTime = safeDateParse(node.attrib['holdingPeriodDateTime']),
        LevelOfDetail = s.LevelOfDetail(node.attrib['levelOfDetail']),
    )
    return trade


def extractOptionTrade(node: etree.ElementBase) -> s.TradeOption:
    notesAndCodesParsed = parseNotes(node.attrib['notes'])
    
    trade = s.TradeOption(
        ClientAccountID = node.attrib['accountId'],
        CurrencyPrimary = node.attrib['currency'],
        FXRateToBase = float(node.attrib['fxRateToBase']),
        AssetClass = s.AssetClass(node.attrib['assetCategory']),
        SubCategory = s.SubCategory(node.attrib['subCategory']),
        Symbol = node.attrib['symbol'],
        Description = node.attrib['description'],
        Conid = node.attrib['conid'],
        FIGI = node.attrib['figi'],
        ListingExchange = node.attrib['listingExchange'],
        UnderlyingConid = node.attrib['underlyingConid'],
        UnderlyingSymbol = node.attrib['underlyingSymbol'],
        UnderlyingSecurityID = node.attrib['underlyingSecurityID'],
        UnderlyingListingExchange = node.attrib['underlyingListingExchange'],
        TradeID = node.attrib['tradeID'],
        Multiplier = float(node.attrib['multiplier']),
        Strike = float(node.attrib['strike']),
        ReportDate = safeDateParse(node.attrib['reportDate']),
        Expiry = safeDateParse(node.attrib['expiry']),
        DateTime = safeDateParse(node.attrib['dateTime']),
        PutOrCall = s.PutOrCall(node.attrib['putCall']),
        TradeDate = safeDateParse(node.attrib['tradeDate']),
        SettleDateTarget = safeDateParse(node.attrib['settleDateTarget']),
        TransactionType = s.TransactionType(node.attrib['transactionType']),
        Exchange = node.attrib['exchange'],
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
        BuyOrSell = s.BuyOrSell(node.attrib['buySell']),
        TransactionID = node.attrib['transactionID'],
        OrderTime = safeDateParse(node.attrib['orderTime']),
        LevelOfDetail = s.LevelOfDetail(node.attrib['levelOfDetail']),
        OrderType = s.OrderType(node.attrib['orderType']),
    )
    return trade



def extractOptionLot(node: etree.ElementBase) -> s.LotOption:
    notesAndCodesParsed = parseNotes(node.attrib['notes'])
    
    trade = s.LotOption(
        ClientAccountID = node.attrib['accountId'],
        CurrencyPrimary = node.attrib['currency'],
        FXRateToBase = float(node.attrib['fxRateToBase']),
        AssetClass = s.AssetClass(node.attrib['assetCategory']),
        SubCategory = s.SubCategory(node.attrib['subCategory']),
        Symbol = node.attrib['symbol'],
        Description = node.attrib['description'],
        Conid = node.attrib['conid'],
        FIGI = node.attrib['figi'],
        ListingExchange = node.attrib['listingExchange'],
        UnderlyingConid = node.attrib['underlyingConid'],
        UnderlyingSymbol = node.attrib['underlyingSymbol'],
        UnderlyingSecurityID = node.attrib['underlyingSecurityID'],
        UnderlyingListingExchange = node.attrib['underlyingListingExchange'],
        Multiplier = float(node.attrib['multiplier']),
        Strike = float(node.attrib['strike']),
        ReportDate = safeDateParse(node.attrib['reportDate']),
        Expiry = safeDateParse(node.attrib['expiry']),
        DateTime = safeDateParse(node.attrib['dateTime']),
        PutOrCall = s.PutOrCall(node.attrib['putCall']),
        TradeDate = safeDateParse(node.attrib['tradeDate']),
        Exchange = node.attrib['exchange'],
        Quantity = float(node.attrib['quantity']),
        TradePrice = float(node.attrib['tradePrice']),
        OpenCloseIndicator = s.OpenCloseIndicator(node.attrib['openCloseIndicator']),
        NotesAndCodes = notesAndCodesParsed,
        CostBasis = float(node.attrib['cost']),
        FifoProfitAndLossRealized = float(node.attrib['fifoPnlRealized']),
        CapitalGainsProfitAndLoss = float(node.attrib['capitalGainsPnl']),
        ForexProfitAndLoss = float(node.attrib['fxPnl']),
        BuyOrSell = s.BuyOrSell(node.attrib['buySell']),
        TransactionID = node.attrib['transactionID'],
        OpenDateTime = safeDateParse(node.attrib['openDateTime']),
        HoldingPeriodDateTime = safeDateParse(node.attrib['holdingPeriodDateTime']),
        LevelOfDetail = s.LevelOfDetail(node.attrib['levelOfDetail']),
    )
    return trade



def extractCashTransaction(node: etree.ElementBase) -> s.TransactionCash:
    trade = s.TransactionCash(
        ClientAccountID=node.attrib["accountId"],
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
        DateTime=safeDateParse(str(node.attrib["dateTime"])),
        SettleDate=safeDateParse(str(node.attrib["settleDate"])),
        Amount=float(node.attrib["amount"]),
        Type=s.CashTransactionType(node.attrib["type"]),
        Code=node.attrib["code"],
        TransactionID=node.attrib["transactionID"],
        ReportDate=safeDateParse(str(node.attrib["reportDate"])),
        ActionID=node.attrib["actionID"]
    )
    return trade





def mergeCashTransactions(transactions: list[list[s.TransactionCash]]) -> list[s.TransactionCash]:
        return deduplicateList(transactions)




def extractTradesFromXML(root: etree.ElementBase) -> s.SegmentedTrades:
    # cashTradesFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Trade[@assetCategory='{}']".format(s.AssetClass.CASH.value))
    # cashTradeNodes = cashTradesFinder(root)
    cashTransactionsFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/CashTransactions/*")
    cashTransactionNodes = cashTransactionsFinder(root)

    optionTradesFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Trade[@assetCategory='{}']".format(s.AssetClass.OPTION.value))
    optionLotsFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Lot[@assetCategory='{}']".format(s.AssetClass.OPTION.value))
    optionTradeNodes = optionTradesFinder(root)
    optionLotNodes = optionLotsFinder(root)

    stockTradesFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Trade[@assetCategory='{}']".format(s.AssetClass.STOCK.value))
    stockLotsFinder = etree.XPath("/FlexQueryResponse/FlexStatements/FlexStatement/Trades/Lot[@assetCategory='{}']".format(s.AssetClass.STOCK.value))
    stockTradeNodes = stockTradesFinder(root)
    stockLotNodes = stockLotsFinder(root)


    # cashTrades = list(map(extractCashTrade, cashTradeNodes))
    cashTransactions = list(map(extractCashTransaction, cashTransactionNodes))

    stockTrades = list(map(extractStockTrade, stockTradeNodes))
    stockLots = list(map(extractStockLot, stockLotNodes))

    optionTrades = list(map(extractOptionTrade, optionTradeNodes))
    optionLots = list(map(extractOptionLot, optionLotNodes))

    

    return s.SegmentedTrades(
        # cashTrades = cashTrades,
        cashTransactions = cashTransactions,
        stockTrades = stockTrades,
        stockLots = stockLots,
        optionTrades = optionTrades,
        optionLots = optionLots,
    )



def mergeTrades(trades: list[s.SegmentedTrades]) -> s.SegmentedTrades:
    stockTrades = list(map(lambda trade: trade.stockTrades, trades))
    optionTrades = list(map(lambda trade: trade.optionTrades, trades))
    # cashTrades = list(map(lambda trade: trade.cashTrades, trades))
    cashTransactions = list(map(lambda trade: trade.cashTransactions, trades))

    stockLots = list(map(lambda trade: trade.stockLots, trades))
    optionLots = list(map(lambda trade: trade.optionLots, trades))

    stockTrades = deduplicateList(stockTrades)
    # cashTrades = deduplicateList(cashTrades)
    optionTrades = deduplicateList(optionTrades)
    cashTransactions = deduplicateList(cashTransactions)

    optionLots = [x for xs in optionLots for x in xs]   # lots cannot be deduplicated, as there is no unique identifer
    stockLots = [x for xs in stockLots for x in xs]   # lots cannot be deduplicated, as there is no unique identifer

    return s.SegmentedTrades(
        # cashTrades = cashTrades,
        cashTransactions = cashTransactions,
        stockTrades = stockTrades,
        stockLots = stockLots,
        optionTrades = optionTrades,
        optionLots = optionLots,
    )