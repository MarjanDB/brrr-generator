import src.ReportingStrategies.GenericFormats as gf
import src.ReportingStrategies.GenericUtilities as gu
import arrow as ar

simpleStockBuy = gf.TradeEventStagingStockAcquired(
    ID = "StockBought",
    ISIN = "US123",
    Ticker = "AAPL",
    AssetClass = gf.GenericAssetClass.STOCK,
    Date = ar.get("2023-01-01"),
    Multiplier = 1,
    AcquiredReason = gf.GenericTradeReportItemGainType.BOUGHT,
    ExchangedMoney = gf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency = "EUR",
        UnderlyingQuantity = 1,
        UnderlyingTradePrice = 10,
        ComissionCurrency = "EUR",
        ComissionTotal = 0,
        TaxCurrency = "EUR",
        TaxTotal = 0
    )
)

simpleStockSold = gf.TradeEventStagingStockSold(
    ID = "StockSold",
    ISIN = "US123",
    Ticker = "AAPL",
    AssetClass = gf.GenericAssetClass.STOCK,
    Date = ar.get("2023-01-02"),
    Multiplier = 1,
    ExchangedMoney = gf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency = "EUR",
        UnderlyingQuantity = 1,
        UnderlyingTradePrice = 15,
        ComissionCurrency = "EUR",
        ComissionTotal = 0,
        TaxCurrency = "EUR",
        TaxTotal = 0
    )
)

simpleStockLot = gf.GenericTaxLotEventStaging(
    ID = "Lot",
    Ticker = "AAPL",
    ISIN = "US123",
    Quantity = 1,
    Acquired = gf.GenericTaxLotMatchingDetails(ID = "StockBought", DateTime = None),
    Sold = gf.GenericTaxLotMatchingDetails(ID = None, DateTime = ar.get("2023-01-02")),
    ShortLongType = gf.GenericShortLong.LONG
)


simpleDerivativeBuy = gf.TradeEventStagingDerivativeAcquired(
    ID = "DerivativeBought",
    ISIN = "US123",
    Ticker = "AAPL",
    AssetClass = gf.GenericAssetClass.STOCK,
    Date = ar.get("2023-01-01"),
    Multiplier = 100,
    AcquiredReason = gf.GenericTradeReportItemGainType.BOUGHT,
    ExchangedMoney = gf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency = "EUR",
        UnderlyingQuantity = 1,
        UnderlyingTradePrice = 10,
        ComissionCurrency = "EUR",
        ComissionTotal = 0,
        TaxCurrency = "EUR",
        TaxTotal = 0
    )
)

simpleDerivativeSold = gf.TradeEventStagingDerivativeSold(
    ID = "DerivativeSold",
    ISIN = "US123",
    Ticker = "AAPL",
    AssetClass = gf.GenericAssetClass.STOCK,
    Date = ar.get("2023-01-02"),
    Multiplier = 1,
    ExchangedMoney = gf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency = "EUR",
        UnderlyingQuantity = 1,
        UnderlyingTradePrice = 15,
        ComissionCurrency = "EUR",
        ComissionTotal = 0,
        TaxCurrency = "EUR",
        TaxTotal = 0
    )
)

simpleDerivativeLot = gf.GenericTaxLotEventStaging(
    ID = "Lot",
    ISIN = "US123",
    Ticker = "AAPL",
    Quantity = 1,
    Acquired = gf.GenericTaxLotMatchingDetails(ID = "DerivativeBought", DateTime = None),
    Sold = gf.GenericTaxLotMatchingDetails(ID = None, DateTime = ar.get("2023-01-02")),
    ShortLongType = gf.GenericShortLong.LONG
)



class TestGenericGroupingsProcessing:
    def testSingleStockLotMatching(self):
        groupings = [gf.GenericUnderlyingGroupingStaging(
            ISIN = "US123",
            CountryOfOrigin = None,
            UnderlyingCategory = gf.GenericCategory.REGULAR,
            StockTrades = [simpleStockBuy, simpleStockSold],
            StockTaxLots = [simpleStockLot],
            DerivativeTrades = [],
            DerivativeTaxLots = [],
            Dividends = []
        )]

        utils = gu.GenericUtilities()

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert results[0].StockTaxLots[0].Acquired == results[0].StockTrades[0]
        assert results[0].StockTaxLots[0].Sold == results[0].StockTrades[1]

    def testSingleDerivativeLotMatching(self):
        groupings = [gf.GenericUnderlyingGroupingStaging(
            ISIN = "US123",
            CountryOfOrigin = None,
            UnderlyingCategory = gf.GenericCategory.REGULAR,
            StockTrades = [],
            StockTaxLots = [],
            DerivativeTrades = [simpleDerivativeBuy, simpleDerivativeSold],
            DerivativeTaxLots = [simpleDerivativeLot],
            Dividends = []
        )]

        utils = gu.GenericUtilities()

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert results[0].DerivativeTaxLots[0].Acquired == results[0].DerivativeTrades[0]
        assert results[0].DerivativeTaxLots[0].Sold == results[0].DerivativeTrades[1]

