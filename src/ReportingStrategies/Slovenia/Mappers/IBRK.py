import src.ExportProvider.IBRK.Schemas as s
import src.ReportingStrategies.GenericFormats as gf
from itertools import groupby
import arrow
from dataclasses import dataclass
from typing import Any, Callable


TRADE_REPORT_ITEM_TYPE_MAPPING = {
    s.AssetClass.STOCK: gf.GenericTradeReportItemType.STOCK
}

ASSET_CLASS_MAPPING = {
    s.AssetClass.STOCK: gf.GenericAssetClass.STOCK
}

@dataclass
class SegmentedTradeBuyEvent:
    Quantity: float
    BuyLine: gf.GenericTradeReportItemSecurityLineBought

@dataclass
class SegmentedTradeSellEvent:
    Quantity: float
    SellLine: gf.GenericTradeReportItemSecurityLineSold

@dataclass
class SegmentedTradeEvents:
    Buys: list[SegmentedTradeBuyEvent]
    Sells: list[SegmentedTradeSellEvent]

@dataclass
class SegmentedTrades:
    Buys: list[gf.GenericTradeReportItemSecurityLineBought]
    Sells: list[gf.GenericTradeReportItemSecurityLineSold]


def deduplicateList(lines: list[Any]):
    uniqueTransactionRows = list({row.TransactionID: row for row in lines}.values())
    return uniqueTransactionRows



def getGenericDividendLineFromIBRKCashTransactions(cashTransactions: list[s.CashTransaction]) -> list[gf.GenericDividendLine]:
    def mapToGenericDividendLine(transaction: s.CashTransaction) -> gf.GenericDividendLine:
        edavkiDividendType = gf.GenericDividendType.UNKNOWN

        ordinaryDividend = transaction.Description.__contains__("Ordinary Dividend")
        bonusDividend = transaction.Description.__contains__("Bonus Dividend")

        if ordinaryDividend:
            edavkiDividendType = gf.GenericDividendType.ORDINARY

        if bonusDividend:
            edavkiDividendType = gf.GenericDividendType.BONUS

        dividendMapping = {
            s.CashTransactionType.DIVIDEND: gf.GenericDividendLineType.DIVIDEND,
            s.CashTransactionType.WITHOLDING_TAX: gf.GenericDividendLineType.WITHOLDING_TAX
        }


        return gf.GenericDividendLine(
            AccountID = transaction.ClientAccountID,
            LineCurrency = transaction.CurrencyPrimary,
            ConversionToBaseAccountCurrency = transaction.FXRateToBase,
            AccountCurrency = transaction.CurrencyPrimary,
            ReceivedDateTime = transaction.DateTime,
            AmountInCurrency = transaction.Amount,
            DividendActionID = transaction.ActionID,
            SecurityISIN = transaction.ISIN,
            ListingExchange = transaction.ListingExchange,
            DividendType = edavkiDividendType,
            LineType = dividendMapping[transaction.Type]
        )


    return list(map(mapToGenericDividendLine, cashTransactions))





def getGenericTradeLinesFromIBRKTrades(trades: s.SegmentedTrades) -> list[gf.GenericTradeReportItem]:
    allTrades = trades.stockTrades

    # lots are set through IBKR, so open and close trades are matched through those lots and aren't generated through this application
    lots = trades.lots

    def getTradeByTransactionId(allTrades: list[s.TradeStock], transactionId: str) -> s.TradeStock | None:
        match = next(filter(lambda trade: trade.TransactionID == transactionId, allTrades), None)
        return match

    def getTradeOnDateTime(allTrades: list[s.TradeStock], date: arrow.Arrow) -> s.TradeStock | None:
        match = next(filter(lambda trade: trade.DateTime == date, allTrades), None)
        return match

    def getTradesForIsin(allTrades: list[s.TradeStock], isin: str) -> list[s.TradeStock]:
        sameInstrumentTrades = list(filter(lambda x: x.ISIN == isin, allTrades))
        return sameInstrumentTrades
    
    def segmentLotByLambda(lots: list[s.TradeLot], callback: Callable[[s.TradeLot], str]) -> dict[str, list[s.TradeLot]]:
        segmented: dict[str, list[s.TradeLot]] = {}
        for key, valuesiter in groupby(lots, key=callback):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    def segmentLotsByIsin(lots: list[s.TradeLot]) -> dict[str, list[s.TradeLot]]:
        return segmentLotByLambda(lots, lambda lot: lot.ISIN)
    
    def segmentLotsByAssetClass(lots: list[s.TradeLot]) -> dict[s.AssetClass, list[s.TradeLot]]:
        return segmentLotByLambda(lots, lambda lot: lot.AssetClass) # type: ignore
    
    def matchTradesWithLots(lots: list[s.TradeLot], trades: list[s.TradeStock]) -> list[gf.GenericTradeReportLotMatches]:
        def createLotMatchFromLot(lot: s.TradeLot, trades: list[s.TradeStock]) -> gf.GenericTradeReportLotMatches:
            
            # lot TransactionId coresponds to the buy event transactionId
            # this means we can use it to match the buy line for this lot
            lotTransactionId = lot.TransactionID
            matchingBuy = getTradeByTransactionId(trades, lotTransactionId)

            
            # TODO: Not all are bought
            acquiredHow = gf.GenericTradeReportItemGainType.BOUGHT
            if lot.SubCategory == s.SubCategory.RIGHT:
                acquiredHow = gf.GenericTradeReportItemGainType.RIGHT_TO_NEWLY_ISSUED_STOCK

            # NOTE: Corporate Actions can result in stocks that haven't been bought
            buyDate = lot.OpenDateTime
            numberOfBought = matchingBuy.Quantity if matchingBuy else lot.Quantity
            tradePriceOfBought = matchingBuy.TradePrice * lot.FXRateToBase if matchingBuy else lot.TradePrice * lot.FXRateToBase
            tradeTotalOfBought = matchingBuy.TradeMoney * lot.FXRateToBase if matchingBuy else lot.TradePrice * lot.Quantity * lot.FXRateToBase
            taxesOfBought = matchingBuy.Taxes * lot.FXRateToBase if matchingBuy else 0

            buyLine = gf.GenericTradeReportItemSecurityLineBought(
                AcquiredDate = buyDate,
                AcquiredHow = acquiredHow, 
                NumberOfUnits = numberOfBought,
                AmountPerUnit = tradePriceOfBought,
                TotalAmountPaid = tradeTotalOfBought,
                TaxPaidForPurchase = taxesOfBought,
                TransactionID = lot.TransactionID   # lot transaction is tied to all related trades
            )

            # finding sell lines is a bit harder, as we can only match by DateTime (should be good enough for most cases)
            sellDate = lot.DateTime
            matchingSell = getTradeOnDateTime(trades, sellDate)
            if matchingSell is None:
                raise ValueError("Could not find matching sell")

            sellLine = gf.GenericTradeReportItemSecurityLineSold(
                SoldDate = sellDate,
                NumberOfUnitsSold = matchingSell.Quantity.__abs__(),
                AmountPerUnit = matchingSell.TradePrice.__abs__() * lot.FXRateToBase,
                TotalAmountSoldFor = matchingSell.TradeMoney.__abs__() * lot.FXRateToBase,
                TransactionID = matchingSell.TransactionID,
                WashSale = True,
                SoldForProfit = True
            )

            genericLot = gf.GenericTradeReportLotMatches(
                TransactionID = lotTransactionId,
                Quantitiy = lot.Quantity,
                LotOriginalBuy = buyLine,
                LotOriginalSell = sellLine
            )

            return genericLot

        genericLotMatches = list(map(lambda lot: createLotMatchFromLot(lot, trades), lots))
        return genericLotMatches
    
    def segmentBuyAndSellTradesWithQuantity(lots: list[gf.GenericTradeReportLotMatches]):
        buyCounts: dict[str, SegmentedTradeBuyEvent] = {}
        sellCounts: dict[str, SegmentedTradeSellEvent] = {}

        for lot in lots:
            buyLine = lot.LotOriginalBuy
            buyTransaction = buyLine.TransactionID
            sellLine = lot.LotOriginalSell
            selltransaction = sellLine.TransactionID
            lotResponsibleForQuantity = lot.Quantitiy

            existingBuyEntry = buyCounts.get(buyTransaction)
            if existingBuyEntry is None:
                existingBuyEntry = SegmentedTradeBuyEvent(Quantity = 0, BuyLine = buyLine)

            existingBuyEntry.Quantity += lotResponsibleForQuantity
            buyCounts[buyTransaction] = existingBuyEntry


            existingSellEntry = sellCounts.get(selltransaction)
            if existingSellEntry is None:
                existingSellEntry = SegmentedTradeSellEvent(Quantity = 0, SellLine = sellLine)

            existingSellEntry.Quantity += lotResponsibleForQuantity
            sellCounts[selltransaction] = existingSellEntry

        return SegmentedTradeEvents(Buys = list(buyCounts.values()), Sells = list(sellCounts.values()))
    
    def createSegmentedTradesBasedOnGenericLots(trades: SegmentedTradeEvents) -> SegmentedTrades:
        def sellEventToGenericSell(sellEvent : SegmentedTradeSellEvent) -> gf.GenericTradeReportItemSecurityLineSold:
            generic = gf.GenericTradeReportItemSecurityLineSold(
                SoldDate = sellEvent.SellLine.SoldDate,
                NumberOfUnitsSold = sellEvent.Quantity,
                AmountPerUnit = sellEvent.SellLine.AmountPerUnit,
                TotalAmountSoldFor = sellEvent.SellLine.AmountPerUnit * sellEvent.Quantity,
                TransactionID = sellEvent.SellLine.TransactionID,
                WashSale = True,
                SoldForProfit = True
            )

            return generic
        
        def buyEventToGenericBuy(buyEvent: SegmentedTradeBuyEvent) -> gf.GenericTradeReportItemSecurityLineBought:
            generic = gf.GenericTradeReportItemSecurityLineBought(
                AcquiredDate = buyEvent.BuyLine.AcquiredDate,
                AcquiredHow = buyEvent.BuyLine.AcquiredHow,
                NumberOfUnits = buyEvent.Quantity,
                AmountPerUnit = buyEvent.BuyLine.AmountPerUnit,
                TotalAmountPaid = buyEvent.BuyLine.AmountPerUnit * buyEvent.Quantity,
                TaxPaidForPurchase = (buyEvent.BuyLine.TaxPaidForPurchase / buyEvent.BuyLine.NumberOfUnits) * buyEvent.Quantity,
                TransactionID = buyEvent.BuyLine.TransactionID
            )

            return generic
        
        genericSells = list(map(sellEventToGenericSell, trades.Sells))
        genericBuys = list(map(buyEventToGenericBuy, trades.Buys))

        genericSegmented = SegmentedTrades(Buys=genericBuys, Sells=genericSells)
        return genericSegmented

    def determineWashSales(lots: list[gf.GenericTradeReportLotMatches], allInstrumentTrades: list[s.TradeStock]) -> list[gf.GenericTradeReportLotMatches]:
        for lot in lots:
            sellLine = lot.LotOriginalSell
            sellDate = sellLine.SoldDate
            salesWithinWashSaleWindow = list(filter(lambda trade: (trade.OrderTime - sellDate).days.__abs__() <= 30 and trade.DateTime != sellDate, allInstrumentTrades))
            soldForProfit = lot.LotOriginalSell.AmountPerUnit - lot.LotOriginalBuy.AmountPerUnit > 0

            lot.LotOriginalSell.WashSale = len(salesWithinWashSaleWindow) > 0
            lot.LotOriginalSell.SoldForProfit = soldForProfit
            
        return lots

    def createReportForIsinAssetClass(isin: str, assetClass: s.AssetClass, lotsForAssetClass: list[s.TradeLot], allTradesForIsin: list[s.TradeStock]) -> gf.GenericTradeReportItem:
        print(isin)

        firstLotForInfo = lots[0]
        ticker = firstLotForInfo.Symbol

        tickerInfo = gf.GenericTradeReportItem(
            InventoryListType = TRADE_REPORT_ITEM_TYPE_MAPPING[assetClass],
            ISIN = isin,
            Ticker = ticker,
            AssetClass = ASSET_CLASS_MAPPING[assetClass],
            HasForeignTax = False, # TODO: Taxes - Will fix if a case shows up
            ForeignTax = None,
            ForeignTaxCountryID = None,
            ForeignTaxCountryName = None,
            Lines = []
        )

        lotMatches = matchTradesWithLots(lotsForAssetClass, allTradesForIsin)

        lotMatchesWithUpdatedWashSaleInformation = determineWashSales(lotMatches, allTradesForIsin)

        segmentedTrades = segmentBuyAndSellTradesWithQuantity(lotMatchesWithUpdatedWashSaleInformation)

        generatedSegmentedTrades = createSegmentedTradesBasedOnGenericLots(segmentedTrades)

        tickerInfo.Lines = generatedSegmentedTrades.Buys + generatedSegmentedTrades.Sells

        return tickerInfo



    def createReportsForIsin(isin: str, lots: list[s.TradeLot], allTrades: list[s.TradeStock]) -> list[gf.GenericTradeReportItem]:
        segmentedByAssetClass = segmentLotsByAssetClass(lots)
        lines: list[gf.GenericTradeReportItem] = list()
        for assetClass, classLots in segmentedByAssetClass.items():
            relevantTrades = getTradesForIsin(allTrades=allTrades, isin=isin)
            report = createReportForIsinAssetClass(isin, assetClass, classLots, relevantTrades)
            lines.append(report)
        return lines

    isinSegmented = segmentLotsByIsin(lots)


    genericTradeReportItems : list[gf.GenericTradeReportItem] = list()

    for isin, tradeLots in isinSegmented.items():
        lotsByAssetClass = createReportsForIsin(isin, tradeLots, allTrades)
        genericTradeReportItems = genericTradeReportItems + lotsByAssetClass


    return genericTradeReportItems