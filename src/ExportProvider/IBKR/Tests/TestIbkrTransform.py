import src.ExportProvider.IBKR.Transform as t
import src.ExportProvider.IBKR.Schemas as es
import arrow as ar


simpleTrade = es.TradeStock(
    ClientAccountID = "test",
    CurrencyPrimary = "EUR",
    FXRateToBase = 1,
    AssetClass = es.AssetClass.STOCK,
    SubCategory = es.SubCategory.COMMON,
    Symbol = "TEST",
    Description = "",
    Conid = "conid",
    SecurityID = "securityid",
    SecurityIDType = es.SecurityIDType.ISIN,
    CUSIP = "cusip",
    ISIN = "US21212112",
    FIGI = "FIGI2121312",
    ListingExchange = "NYSE",
    ReportDate = ar.get("2023-01-01"),
    DateTime = ar.get("2023-01-01T13:00:15"),
    TradeDate = ar.get("2023-01-01"),
    TransactionType = es.TransactionType.EXCHANGE_TRADE,
    Exchange = "EXCHA",
    Quantity = 2,
    TradePrice = 15,
    TradeMoney = 30,
    Proceeds = 1,
    Taxes = 0,
    IBCommission = 2,
    IBCommissionCurrency = "EUR",
    NetCash = -33,
    NetCashInBase = -33,
    ClosePrice = 15,
    OpenCloseIndicator = es.OpenCloseIndicator.OPEN,
    NotesAndCodes = [es.Codes.OPENING_TRADE],
    CostBasis = 33,
    FifoProfitAndLossRealized = 0,
    CapitalGainsProfitAndLoss = 0,
    ForexProfitAndLoss = 0,
    MarketToMarketProfitAndLoss = 0,
    BuyOrSell = es.BuyOrSell.BUY,
    TransactionID = "ID",
    OrderTime = ar.get("2023-01-01T13:00:02"),
    LevelOfDetail = es.LevelOfDetail.EXECUTION,
    ChangeInPrice = 0,
    ChangeInQuantity = 2,
    OrderType = es.OrderType.LIMIT,
    AccruedInterest = 0
)


simpleStockLot = es.LotStock(
    ClientAccountID = "test",
    CurrencyPrimary = "EUR",
    FXRateToBase = 1,
    AssetClass = es.AssetClass.STOCK,
    SubCategory = es.SubCategory.COMMON,
    Symbol = "TEST",
    Description = "",
    Conid = "conid",
    SecurityID = "securityid",
    SecurityIDType = es.SecurityIDType.ISIN,
    CUSIP = "cusip",
    ISIN = "US21212112",
    FIGI = "FIGI2121312",
    ListingExchange = "NYSE",
    Multiplier = 1,
    ReportDate = ar.get("2023-01-05"),
    DateTime = ar.get("2023-01-05T13:00:15"),
    TradeDate = ar.get("2023-01-05"),
    Exchange = "EXCHA",
    Quantity = 2,
    TradePrice = 15,
    OpenCloseIndicator = es.OpenCloseIndicator.CLOSE,
    NotesAndCodes = [es.Codes.CLOSING_TRADE],
    CostBasis = 33,
    FifoProfitAndLossRealized = 5,
    CapitalGainsProfitAndLoss = 5,
    ForexProfitAndLoss = 0,
    BuyOrSell = es.BuyOrSell.SELL,
    TransactionID = "ID",
    OpenDateTime = ar.get("2023-01-01T13:00:15"),
    HoldingPeriodDateTime = ar.get("2023-01-01T13:00:15"),
    LevelOfDetail = es.LevelOfDetail.CLOSED_LOT
)

class TestIbkrTransform:
    def testSingleStockTrade(self):
        segmented = es.SegmentedTrades(
            cashTransactions=[],
            stockTrades=[simpleTrade],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[]
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1,  "Given a single trade, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.ISIN == "US21212112", "Underlying group ISIN should match the trade ISIN"
        assert extracted.StockTrades[0].ISIN == "US21212112", "The trade ISIN should match the ISIN of the group"

    def testSingleStockLot(self):
        segmented = es.SegmentedTrades(
            cashTransactions=[],
            stockTrades=[],
            stockLots=[simpleStockLot],
            derivativeTrades=[],
            derivativeLots=[]
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1,  "Given a single trade, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.ISIN == "US21212112", "Underlying group ISIN should match the lot ISIN"
        assert extracted.StockTaxLots[0].ISIN == "US21212112", "The lot ISIN should match the ISIN of the group"