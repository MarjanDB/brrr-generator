import src.ExportProvider.IBRK.Schemas as s
import src.ReportingStrategies.GenericFormats as gf
from itertools import groupby


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

    # only interested in closed lots, we do not take into account custom lot matching, as that can be achieved through IBKR
    lots = trades.lots
    allTrades = trades.stockTrades

    ISINSegmented: dict[str, list[s.TradeLot]] = {}
    for key, valuesiter in groupby(lots, key=lambda lot: lot.ISIN):
        ISINSegmented[key] = list(v for v in valuesiter)

    genericTradeReportItems : list[gf.GenericTradeReportItem] = list()

    for isin, tradeLots in ISINSegmented.items():
        firstTradeForInfoGrabbing = tradeLots[0]

        ticker = firstTradeForInfoGrabbing.Symbol

        tradeReportItemTypeMapping = {
            s.AssetClass.STOCK: gf.GenericTradeReportItemType.STOCK
        }

        assetClassMapping = {
            s.AssetClass.STOCK: gf.GenericAssetClass.STOCK
        }

        # TODO: It's possible to have more than one type of asset class trade per ISIN, should take into account?
        tickerInfo = gf.GenericTradeReportItem(
            InventoryListType = tradeReportItemTypeMapping[firstTradeForInfoGrabbing.AssetClass],
            ISIN = isin,
            Ticker = ticker,
            AssetClass = assetClassMapping[firstTradeForInfoGrabbing.AssetClass],
            HasForeignTax = False, # TODO: Taxes - Will fix if a case shows up
            ForeignTax = None,
            ForeignTaxCountryID = None,
            ForeignTaxCountryName = None,
            Lines = []
        )

        # we're interested in Capital Gains, as those are the actual taxable events associated with the trade
        # forex gains are ignored (if trading foreign currency), as those will be taken into account in the actual forex gains report
        # https://www.investopedia.com/terms/c/capitalgain.asp
        def convertLotToBuyAndSell(lot: s.TradeLot) -> list[gf.GenericTradeReportItemSecurityLineBought | gf.GenericTradeReportItemSecurityLineSold]:
            buyDate = lot.OpenDateTime
            sellDate = lot.DateTime

            # TODO: Not all are bought
            acquiredHow = gf.GenericTradeReportItemGainType.BOUGHT
            if lot.SubCategory == s.SubCategory.RIGHT:
                acquiredHow = gf.GenericTradeReportItemGainType.RIGHT_TO_NEWLY_ISSUED_STOCK


            # TODO: Since we're using lots are provided by IBKR, tax information and single unit cost is lost
            # Is this a problem?
            buyLine = gf.GenericTradeReportItemSecurityLineBought(
                AcquiredDate = buyDate,
                AcquiredHow = acquiredHow, 
                NumberOfUnits = lot.Quantity,
                AmountPerUnit = lot.CostBasis / lot.Quantity,
                TotalAmountPaid = lot.CostBasis,
                TaxPaidForPurchase = 0
            )

            # for wash sales, we need to check all transactions for this instrument
            # if at least one was done 30 days before or after this tax lot close, this becomes a wash sale
            # OrderTime is date of actual execution, while DateTime is when it was placed
            # (no other way of avoiding matching its own sell)
            nonlocal allTrades
            sameInstrumentTrades = list(filter(lambda x: x.ISIN == isin, allTrades))
            relevantTradesOfThisInstrument = list(filter(lambda trade: (trade.OrderTime - sellDate).days.__abs__() <= 30 and trade.DateTime.to('utc').format() != sellDate.to('utc').format() , sameInstrumentTrades))

            sellLine = gf.GenericTradeReportItemSecurityLineSold(
                SoldDate = sellDate,
                NumberOfUnitsSold = lot.Quantity,
                AmountPerUnit = (lot.CostBasis + lot.CapitalGainsProfitAndLoss) / lot.Quantity,
                TotalAmountSoldFor = lot.CostBasis + lot.CapitalGainsProfitAndLoss,
                WashSale = relevantTradesOfThisInstrument.__len__() > 0 and lot.CapitalGainsProfitAndLoss < 0,
                SoldForProfit = lot.CapitalGainsProfitAndLoss > 0 or lot.CostBasis == 0 # gifted have cost basis of 0, and are always a profit
            )

            return [buyLine, sellLine]

        convertedLots = list(map(convertLotToBuyAndSell, tradeLots))

        allLots = [item for row in convertedLots for item in row]

        tickerInfo.Lines = allLots

        genericTradeReportItems.append(tickerInfo)



    return genericTradeReportItems