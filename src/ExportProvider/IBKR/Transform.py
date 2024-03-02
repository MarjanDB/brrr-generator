import src.ExportProvider.IBKR.Schemas as s
import src.ReportingStrategies.GenericFormats as gf
from itertools import groupby
import arrow
from dataclasses import dataclass
from typing import Any, Callable, TypeVar, Generic, Sequence

LINE_GENERIC_BUY = TypeVar('LINE_GENERIC_BUY')
LINE_GENERIC_SELL = TypeVar('LINE_GENERIC_SELL')



@dataclass
class SegmentedBuyEvent(Generic[LINE_GENERIC_BUY]):
    Quantity: float
    BuyLine: LINE_GENERIC_BUY

@dataclass
class SegmentedSellEvent(Generic[LINE_GENERIC_SELL]):
    Quantity: float
    SellLine: LINE_GENERIC_SELL

@dataclass
class SegmentedTradeEvents(Generic[LINE_GENERIC_BUY, LINE_GENERIC_SELL]):
    Buys: list[SegmentedBuyEvent[LINE_GENERIC_BUY]]
    Sells: list[SegmentedSellEvent[LINE_GENERIC_SELL]]

@dataclass
class SegmentedTrades(Generic[LINE_GENERIC_BUY, LINE_GENERIC_SELL]):
    Buys: list[LINE_GENERIC_BUY]
    Sells: list[LINE_GENERIC_SELL]


def deduplicateList(lines: list[Any]):
    uniqueTransactionRows = list({row.TransactionID: row for row in lines}.values())
    return uniqueTransactionRows



def getGenericDividendLineFromIBRKCashTransactions(cashTransactions: list[s.TransactionCash]) -> list[gf.GenericDividendLine]:
    def mapToGenericDividendLine(transaction: s.TransactionCash) -> gf.GenericDividendLine:
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
    lots = trades.stockLots

    def getTradeByTransactionId(allTrades: list[s.TradeStock], transactionId: str) -> s.TradeStock | None:
        match = next(filter(lambda trade: trade.TransactionID == transactionId, allTrades), None)
        return match

    def getTradeOnDateTime(allTrades: list[s.TradeStock], date: arrow.Arrow) -> s.TradeStock | None:
        match = next(filter(lambda trade: trade.DateTime == date, allTrades), None)
        return match

    def getTradesForIsin(allTrades: list[s.TradeStock], isin: str) -> list[s.TradeStock]:
        sameInstrumentTrades = list(filter(lambda x: x.ISIN == isin, allTrades))
        return sameInstrumentTrades
    
    def segmentLotByLambda(lots: list[s.LotStock], callback: Callable[[s.LotStock], str]) -> dict[str, list[s.LotStock]]:
        segmented: dict[str, list[s.LotStock]] = {}
        for key, valuesiter in groupby(lots, key=callback):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    def segmentLotsByIsin(lots: list[s.LotStock]) -> dict[str, list[s.LotStock]]:
        return segmentLotByLambda(lots, lambda lot: lot.ISIN)
    
    def segmentLotsByAssetClass(lots: list[s.LotStock]) -> dict[s.AssetClass, list[s.LotStock]]:
        return segmentLotByLambda(lots, lambda lot: lot.AssetClass) # type: ignore
    
    def matchTradesWithLots(lots: list[s.LotStock], trades: list[s.TradeStock]) -> list[gf.GenericTradeReportLotMatches]:
        def createLotMatchFromLot(lot: s.LotStock, trades: list[s.TradeStock]) -> gf.GenericTradeReportLotMatches:
            
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
            tradePriceOfBought = matchingBuy.TradePrice * matchingBuy.FXRateToBase if matchingBuy else lot.TradePrice * lot.FXRateToBase
            tradeTotalOfBought = matchingBuy.TradeMoney * matchingBuy.FXRateToBase if matchingBuy else lot.TradePrice * lot.Quantity * lot.FXRateToBase
            taxesOfBought = matchingBuy.Taxes * matchingBuy.FXRateToBase if matchingBuy else 0

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
        buyCounts: dict[str, SegmentedBuyEvent[gf.GenericTradeReportItemSecurityLineBought]] = {}
        sellCounts: dict[str, SegmentedSellEvent[gf.GenericTradeReportItemSecurityLineSold]] = {}

        for lot in lots:
            buyLine = lot.LotOriginalBuy
            buyTransaction = buyLine.TransactionID
            sellLine = lot.LotOriginalSell
            selltransaction = sellLine.TransactionID
            lotResponsibleForQuantity = lot.Quantitiy

            existingBuyEntry = buyCounts.get(buyTransaction)
            if existingBuyEntry is None:
                existingBuyEntry = SegmentedBuyEvent(Quantity = 0, BuyLine = buyLine)

            existingBuyEntry.Quantity += lotResponsibleForQuantity
            buyCounts[buyTransaction] = existingBuyEntry


            existingSellEntry = sellCounts.get(selltransaction)
            if existingSellEntry is None:
                existingSellEntry = SegmentedSellEvent(Quantity = 0, SellLine = sellLine)

            existingSellEntry.Quantity += lotResponsibleForQuantity
            sellCounts[selltransaction] = existingSellEntry

        return SegmentedTradeEvents(Buys = list(buyCounts.values()), Sells = list(sellCounts.values()))
    
    def createSegmentedTradesBasedOnGenericLots(trades: SegmentedTradeEvents[gf.GenericTradeReportItemSecurityLineBought, gf.GenericTradeReportItemSecurityLineSold]) -> SegmentedTrades[gf.GenericTradeReportItemSecurityLineBought, gf.GenericTradeReportItemSecurityLineSold]:
        def sellEventToGenericSell(sellEvent : SegmentedSellEvent[gf.GenericTradeReportItemSecurityLineSold]) -> gf.GenericTradeReportItemSecurityLineSold:
            generic = gf.GenericTradeReportItemSecurityLineSold(
                SoldDate = sellEvent.SellLine.SoldDate,
                NumberOfUnitsSold = sellEvent.Quantity,
                AmountPerUnit = sellEvent.SellLine.AmountPerUnit,
                TotalAmountSoldFor = sellEvent.SellLine.AmountPerUnit * sellEvent.Quantity,
                TransactionID = sellEvent.SellLine.TransactionID,
                WashSale = sellEvent.SellLine.WashSale,
                SoldForProfit = sellEvent.SellLine.SoldForProfit
            )

            return generic
        
        def buyEventToGenericBuy(buyEvent: SegmentedBuyEvent[gf.GenericTradeReportItemSecurityLineBought]) -> gf.GenericTradeReportItemSecurityLineBought:
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

    def createReportForIsinAssetClass(isin: str, assetClass: s.AssetClass, lotsForAssetClass: list[s.LotStock], allTradesForIsin: list[s.TradeStock]) -> gf.GenericTradeReportItem:
        print(isin)

        firstLotForInfo = lotsForAssetClass[0]
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



    def createReportsForIsin(isin: str, lots: list[s.LotStock], allTrades: list[s.TradeStock]) -> list[gf.GenericTradeReportItem]:
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









def getGenericDerivativeTradeLinesFromIBRKTrades(trades: s.SegmentedTrades) -> list[gf.GenericDerivativeReportItem]:
    allTrades = trades.derivativeTrades

    # lots are set through IBKR, so open and close trades are matched through those lots and aren't generated through this application
    # TODO: some countries might require a specific lot matching algo to be used (FIFO for example)
    lots = trades.derivativeLots

    def getTradeByTransactionId(allTrades: list[s.TradeDerivative], transactionId: str) -> s.TradeDerivative | None:
        match = next(filter(lambda trade: trade.TransactionID == transactionId, allTrades), None)
        return match

    def getTradeOnDateTime(allTrades: list[s.TradeDerivative], date: arrow.Arrow) -> s.TradeDerivative | None:
        match = next(filter(lambda trade: trade.DateTime == date, allTrades), None)
        return match

    def getTradesForIsin(allTrades: list[s.TradeDerivative], isin: str) -> list[s.TradeDerivative]:
        sameInstrumentTrades = list(filter(lambda x: x.UnderlyingSecurityID == isin, allTrades))
        return sameInstrumentTrades
    
    def segmentLotByLambda(lots: list[s.LotDerivative], callback: Callable[[s.LotDerivative], str]) -> dict[str, list[s.LotDerivative]]:
        segmented: dict[str, list[s.LotDerivative]] = {}
        for key, valuesiter in groupby(lots, key=callback):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    def segmentLotsByIsin(lots: list[s.LotDerivative]) -> dict[str, list[s.LotDerivative]]:
        return segmentLotByLambda(lots, lambda lot: lot.UnderlyingSecurityID)
    
    def segmentLotsByAssetClass(lots: list[s.LotDerivative]) -> dict[s.AssetClass, list[s.LotDerivative]]:
        return segmentLotByLambda(lots, lambda lot: lot.AssetClass) # type: ignore
    
    def matchTradesWithLots(lots: list[s.LotDerivative], trades: list[s.TradeDerivative]) -> list[gf.GenericDerivativeReportLotMatches]:
        def createLotMatchFromLot(lot: s.LotDerivative, trades: list[s.TradeDerivative]) -> gf.GenericDerivativeReportLotMatches:
            
            # lot TransactionId coresponds to the buy event transactionId
            # this means we can use it to match the buy line for this lot
            lotTransactionId = lot.TransactionID
            matchingBuy = getTradeByTransactionId(trades, lotTransactionId)

            
            # TODO: Not all are bought
            acquiredHow = gf.GenericDerivativeReportItemGainType.BOUGHT

            # NOTE: Corporate Actions can result in stocks that haven't been bought
            buyDate = lot.OpenDateTime
            numberOfBought = matchingBuy.Quantity if matchingBuy else lot.Quantity
            tradePriceOfBought = matchingBuy.TradePrice * matchingBuy.FXRateToBase * matchingBuy.Multiplier if matchingBuy else lot.TradePrice * lot.FXRateToBase * lot.Multiplier
            tradeTotalOfBought = matchingBuy.TradeMoney * matchingBuy.FXRateToBase if matchingBuy else lot.TradePrice * lot.Quantity * lot.FXRateToBase * lot.Multiplier
            taxesOfBought = matchingBuy.Taxes * matchingBuy.FXRateToBase if matchingBuy else 0

            buyLine = gf.GenericDerivativeReportItemSecurityLineBought(
                AcquiredDate = buyDate,
                AcquiredHow = acquiredHow, 
                NumberOfUnits = numberOfBought,
                AmountPerUnit = tradePriceOfBought,
                TotalAmountPaid = tradeTotalOfBought,
                TaxPaidForPurchase = taxesOfBought,
                TransactionID = lot.TransactionID,   # lot transaction is tied to all related trades
                Leveraged = False
            )

            # finding sell lines is a bit harder, as we can only match by DateTime (should be good enough for most cases)
            sellDate = lot.DateTime
            matchingSell = getTradeOnDateTime(trades, sellDate)
            if matchingSell is None:
                raise ValueError("Could not find matching sell")

            sellLine = gf.GenericDerivativeReportItemSecurityLineSold(
                SoldDate = sellDate,
                NumberOfUnitsSold = matchingSell.Quantity.__abs__(),
                AmountPerUnit = matchingSell.TradePrice.__abs__() * lot.FXRateToBase * matchingSell.Multiplier,
                TotalAmountSoldFor = matchingSell.TradeMoney.__abs__() * lot.FXRateToBase * matchingSell.Multiplier,
                TransactionID = matchingSell.TransactionID,
                WashSale = True,
                SoldForProfit = True,
                Leveraged = False
            )

            genericLot = gf.GenericDerivativeReportLotMatches(
                TransactionID = lotTransactionId,
                Quantitiy = lot.Quantity,
                LotOriginalBuy = buyLine,
                LotOriginalSell = sellLine
            )

            return genericLot

        genericLotMatches = list(map(lambda lot: createLotMatchFromLot(lot, trades), lots))
        return genericLotMatches
    
    def segmentBuyAndSellTradesWithQuantity(lots: list[gf.GenericDerivativeReportLotMatches]):
        buyCounts: dict[str, SegmentedBuyEvent[gf.GenericDerivativeReportItemSecurityLineBought]] = {}
        sellCounts: dict[str, SegmentedSellEvent[gf.GenericDerivativeReportItemSecurityLineSold]] = {}

        for lot in lots:
            buyLine = lot.LotOriginalBuy
            buyTransaction = buyLine.TransactionID
            sellLine = lot.LotOriginalSell
            selltransaction = sellLine.TransactionID
            lotResponsibleForQuantity = lot.Quantitiy

            existingBuyEntry = buyCounts.get(buyTransaction)
            if existingBuyEntry is None:
                existingBuyEntry = SegmentedBuyEvent(Quantity = 0, BuyLine = buyLine)

            existingBuyEntry.Quantity += lotResponsibleForQuantity
            buyCounts[buyTransaction] = existingBuyEntry


            existingSellEntry = sellCounts.get(selltransaction)
            if existingSellEntry is None:
                existingSellEntry = SegmentedSellEvent(Quantity = 0, SellLine = sellLine)

            existingSellEntry.Quantity += lotResponsibleForQuantity
            sellCounts[selltransaction] = existingSellEntry

        return SegmentedTradeEvents(Buys = list(buyCounts.values()), Sells = list(sellCounts.values()))
    
    def createSegmentedTradesBasedOnGenericLots(trades: SegmentedTradeEvents[gf.GenericDerivativeReportItemSecurityLineBought, gf.GenericDerivativeReportItemSecurityLineSold]) -> SegmentedTrades[gf.GenericDerivativeReportItemSecurityLineBought, gf.GenericDerivativeReportItemSecurityLineSold]:
        def sellEventToGenericSell(sellEvent : SegmentedSellEvent[gf.GenericDerivativeReportItemSecurityLineSold]) -> gf.GenericDerivativeReportItemSecurityLineSold:
            generic = gf.GenericDerivativeReportItemSecurityLineSold(
                SoldDate = sellEvent.SellLine.SoldDate,
                NumberOfUnitsSold = sellEvent.Quantity,
                AmountPerUnit = sellEvent.SellLine.AmountPerUnit,
                TotalAmountSoldFor = sellEvent.SellLine.AmountPerUnit * sellEvent.Quantity,
                TransactionID = sellEvent.SellLine.TransactionID,
                WashSale = sellEvent.SellLine.WashSale,
                SoldForProfit = sellEvent.SellLine.SoldForProfit,
                Leveraged = False
            )

            return generic
        
        def buyEventToGenericBuy(buyEvent: SegmentedBuyEvent[gf.GenericDerivativeReportItemSecurityLineBought]) -> gf.GenericDerivativeReportItemSecurityLineBought:
            generic = gf.GenericDerivativeReportItemSecurityLineBought(
                AcquiredDate = buyEvent.BuyLine.AcquiredDate,
                AcquiredHow = buyEvent.BuyLine.AcquiredHow,
                TaxPaidForPurchase = 0,
                NumberOfUnits = buyEvent.Quantity,
                AmountPerUnit = buyEvent.BuyLine.AmountPerUnit,
                TotalAmountPaid = buyEvent.BuyLine.AmountPerUnit * buyEvent.Quantity,
                TransactionID = buyEvent.BuyLine.TransactionID,
                Leveraged = False
            )

            return generic
        
        genericSells = list(map(sellEventToGenericSell, trades.Sells))
        genericBuys = list(map(buyEventToGenericBuy, trades.Buys))

        genericSegmented = SegmentedTrades(Buys=genericBuys, Sells=genericSells)
        return genericSegmented

    def determineWashSales(lots: list[gf.GenericDerivativeReportLotMatches], allInstrumentTrades: list[s.TradeDerivative], allUnderlyingTrades: list[s.TradeStock]) -> list[gf.GenericDerivativeReportLotMatches]:
        for lot in lots:
            sellLine = lot.LotOriginalSell
            sellDate = sellLine.SoldDate
            salesSameWithinWashSaleWindow = list(filter(lambda trade: (trade.OrderTime - sellDate).days.__abs__() <= 30 and trade.DateTime != sellDate, allInstrumentTrades))
            salesUnderlyingWithinWashSaleWindow = list(filter(lambda trade: (trade.OrderTime - sellDate).days.__abs__() <= 30 and trade.DateTime != sellDate, allUnderlyingTrades))
            soldForProfit = lot.LotOriginalSell.AmountPerUnit - lot.LotOriginalBuy.AmountPerUnit > 0

            lot.LotOriginalSell.WashSale = len(salesSameWithinWashSaleWindow) > 0 or len(salesUnderlyingWithinWashSaleWindow) > 0
            lot.LotOriginalSell.SoldForProfit = soldForProfit
            
        return lots

    def createReportForIsinAssetClass(isin: str, assetClass: s.AssetClass, lotsForAssetClass: list[s.LotDerivative], allTradesForIsin: list[s.TradeDerivative], allUnderlyingTradesForIsin: list[s.TradeStock]) -> gf.GenericDerivativeReportItem:
        print(isin)

        firstLotForInfo = lotsForAssetClass[0]
        ticker = firstLotForInfo.Symbol

        tickerInfo = gf.GenericDerivativeReportItem(
            InventoryListType = gf.GenericDerivativeReportItemType.DERIVATIVE,  # TODO: Actual type?
            AssetClass = ASSET_CLASS_MAPPING_DERIVATIVE[assetClass],
            ISIN = isin,
            Ticker = ticker,
            HasForeignTax = False, # TODO: Taxes - Will fix if a case shows up
            ForeignTax = None,
            ForeignTaxCountryID = None,
            ForeignTaxCountryName = None,
            Lines = []
        )

        lotMatches = matchTradesWithLots(lotsForAssetClass, allTradesForIsin)

        lotMatchesWithUpdatedWashSaleInformation = determineWashSales(lotMatches, allTradesForIsin, allUnderlyingTradesForIsin)

        segmentedTrades = segmentBuyAndSellTradesWithQuantity(lotMatchesWithUpdatedWashSaleInformation)

        generatedSegmentedTrades = createSegmentedTradesBasedOnGenericLots(segmentedTrades)

        tickerInfo.Lines = generatedSegmentedTrades.Buys + generatedSegmentedTrades.Sells

        return tickerInfo



    def createReportsForIsin(isin: str, lots: list[s.LotDerivative], allTrades: list[s.TradeDerivative]) -> list[gf.GenericDerivativeReportItem]:
        segmentedByAssetClass = segmentLotsByAssetClass(lots)
        lines: list[gf.GenericDerivativeReportItem] = list()
        for assetClass, classLots in segmentedByAssetClass.items():
            relevantTrades = getTradesForIsin(allTrades=allTrades, isin=isin)
            report = createReportForIsinAssetClass(isin, assetClass, classLots, relevantTrades, [])
            lines.append(report)
        return lines

    isinSegmented = segmentLotsByIsin(lots)


    genericTradeReportItems : list[gf.GenericDerivativeReportItem] = list()

    for isin, tradeLots in isinSegmented.items():
        lotsByAssetClass = createReportsForIsin(isin, tradeLots, allTrades)
        genericTradeReportItems = genericTradeReportItems + lotsByAssetClass


    return genericTradeReportItems







def convertStockTradesToStockTradeEvents(trades: Sequence[s.TradeStock]) -> Sequence[gf.GenericTradeEventStockAcquired | gf.GenericTradeEventStockSold]:

    def convertAcquiredTradeToAcquiredEvent(trade: s.TradeStock) -> gf.GenericTradeEventStockAcquired:
        converted = gf.GenericTradeEventStockAcquired(
            ID = trade.TransactionID,
            ISIN = trade.ISIN,
            AssetClass = gf.GenericAssetClass.STOCK,
            Date = trade.DateTime,
            Quantity = trade.Quantity,
            AmountPerQuantity = trade.TradePrice,
            TotalAmount = trade.TradeMoney,
            TaxTotal = trade.Taxes,
            Multiplier = 1,
            AcquiredReason = gf.GenericTradeReportItemGainType.BOUGHT,  # TODO: Determine reason for acquire
        )
        return converted

    def convertSoldTradeToSoldEvent(trade: s.TradeStock) -> gf.GenericTradeEventStockSold:
        converted = gf.GenericTradeEventStockSold(
            ID = trade.TransactionID,
            ISIN = trade.ISIN,
            AssetClass = gf.GenericAssetClass.STOCK,
            Date = trade.DateTime,
            Quantity = trade.Quantity,
            AmountPerQuantity = trade.TradePrice,
            TotalAmount = trade.TradeMoney,
            TaxTotal = trade.Taxes,
            Multiplier = 1,
            HasTradesToUnderlyingRecently = False
        )
        return converted

    def convertTradeToTradeEvent(trade: s.TradeStock) -> gf.GenericTradeEventStockSold | gf.GenericTradeEventStockAcquired:
        buyEvent = trade.Quantity > 0
        if buyEvent:
            return convertAcquiredTradeToAcquiredEvent(trade)
        else:
            return convertSoldTradeToSoldEvent(trade)

    tradeEvents = list(map(convertTradeToTradeEvent, trades))
    return tradeEvents

def convertStockLotsToStockLotEvents(lots: Sequence[s.LotStock]) -> Sequence[gf.GenericTradeTaxLotStock]:
    return []



def convertDerivativeTradesToDerivativeTradeEvents(trades: Sequence[s.TradeDerivative]) -> Sequence[gf.GenericTradeEventDerivativeAcquired | gf.GenericTradeEventDerivativeSold]:
    
    def convertAcquiredTradeToAcquiredEvent(trade: s.TradeDerivative) -> gf.GenericTradeEventDerivativeAcquired:
        converted = gf.GenericTradeEventDerivativeAcquired(
            ID = trade.TransactionID,
            ISIN = trade.UnderlyingSecurityID,
            AssetClass = gf.GenericAssetClass.OPTION,   # TODO: Could also be stock but leveraged (multiplier)
            Date = trade.DateTime,
            Quantity = trade.Quantity,
            AmountPerQuantity = trade.TradePrice,
            TotalAmount = trade.TradeMoney,
            TaxTotal = trade.Taxes,
            Multiplier = trade.Multiplier,
            AcquiredReason = gf.GenericTradeReportItemGainType.BOUGHT,  # TODO: Determine reason for acquire
        )
        return converted

    def convertSoldTradeToSoldEvent(trade: s.TradeDerivative) -> gf.GenericTradeEventDerivativeSold:
        converted = gf.GenericTradeEventDerivativeSold(
            ID = trade.TransactionID,
            ISIN = trade.UnderlyingSecurityID,
            AssetClass = gf.GenericAssetClass.OPTION,
            Date = trade.DateTime,
            Quantity = trade.Quantity,
            AmountPerQuantity = trade.TradePrice,
            TotalAmount = trade.TradeMoney,
            TaxTotal = trade.Taxes,
            Multiplier = trade.Multiplier,
            HasTradesToUnderlyingRecently = False
        )
        return converted

    def convertTradeToTradeEvent(trade: s.TradeDerivative) -> gf.GenericTradeEventDerivativeSold | gf.GenericTradeEventDerivativeAcquired:
        buyEvent = trade.Quantity > 0
        if buyEvent:
            return convertAcquiredTradeToAcquiredEvent(trade)
        else:
            return convertSoldTradeToSoldEvent(trade)

    tradeEvents = list(map(convertTradeToTradeEvent, trades))
    return tradeEvents

def convertDerivativeLotsToDerivativeLotEvents(lots: Sequence[s.LotDerivative]) -> Sequence[gf.GenericTradeTaxLotDerivative]:
    return []





def convertSegmentedTradesToGenericUnderlyingGroups(segmented: s.SegmentedTrades) -> Sequence[gf.GenericUnderlyingGrouping]:
    stockTrades = segmented.stockTrades
    stockLots = segmented.stockLots

    derivativeTrades = segmented.derivativeTrades
    derivativeLots = segmented.derivativeLots


    stockTradeEvents = convertStockTradesToStockTradeEvents(stockTrades)
    stockLotEvents = convertStockLotsToStockLotEvents(stockLots)


    derivativeTradeEvents = convertDerivativeTradesToDerivativeTradeEvents(derivativeTrades)
    derivativeLotEvents = convertDerivativeLotsToDerivativeLotEvents(derivativeLots)


    def segmentTradeByIsin(trades: list[gf.GenericTradeEvent]) -> dict[str, Sequence[gf.GenericTradeEvent]]:
        segmented: dict[str, Sequence[gf.GenericTradeEvent]] = {}
        for key, valuesiter in groupby(trades, key=lambda trade: trade.ISIN):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    stocksSegmented = segmentTradeByIsin(stockTradeEvents) # type: ignore
    derivativesSegmented = segmentTradeByIsin(derivativeTradeEvents) # type: ignore

    allIsinsPresent = list(set(list(stocksSegmented.keys()) + list(derivativesSegmented.keys())))

    generatedUnderlyingGroups : Sequence[gf.GenericUnderlyingGrouping] = list()
    for isin in allIsinsPresent:
        wrapper = gf.GenericUnderlyingGrouping(
            ISIN = isin,
            CountryOfOrigin = None,
            UnderlyingCategory = gf.GenericCategory.REGULAR,
            StockTrades = stocksSegmented.get(isin, []),    # type: ignore
            StockTaxLots = [],
            DerivativeTrades = derivativesSegmented.get(isin, []),  # type: ignore
            DerivativeTaxLots = [],
            Dividends = []
        )
        generatedUnderlyingGroups.append(wrapper)


    return generatedUnderlyingGroups;