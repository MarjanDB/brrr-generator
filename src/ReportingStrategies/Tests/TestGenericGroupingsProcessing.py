import src.ReportingStrategies.GenericFormats as gf
import src.ReportingStrategies.GenericUtilities as gu
import arrow as ar

simpleBuy = gf.TradeEventStagingStockAcquired(
    ID = "StockBought",
    ISIN = "US123",
    AssetClass = gf.GenericAssetClass.STOCK,
    Date = ar.get("2023-01-01"),
    Quantity = 1,
    AmountPerQuantity = 10,
    TotalAmount = 10,
    TaxTotal = 0,
    Multiplier = 1,
    AcquiredReason = gf.GenericTradeReportItemGainType.BOUGHT
)

simpleSold = gf.TradeEventStagingStockSold(
    ID = "StockSold",
    ISIN = "US123",
    AssetClass = gf.GenericAssetClass.STOCK,
    Date = ar.get("2023-01-02"),
    Quantity = 1,
    AmountPerQuantity = 15,
    TotalAmount = 15,
    TaxTotal = 0,
    Multiplier = 1
)

simpleLot = gf.GenericTaxLotEventStaging(
    ID = "Lot",
    ISIN = "US123",
    Quantity = 1,
    Acquired = gf.GenericTaxLotMatchingDetails(ID = "US123", DateTime = None),
    Sold = gf.GenericTaxLotMatchingDetails(ID = None, DateTime = ar.get("2023-01-02")),
    ShortLongType = gf.GenericShortLong.LONG
)



class TestGenericGroupingsProcessing:



    def testSingleLotMatching(self):
        groupings = [gf.GenericUnderlyingGroupingStaging(
            ISIN = "US123",
            CountryOfOrigin = None,
            UnderlyingCategory = gf.GenericCategory.REGULAR,
            StockTrades = [simpleBuy, simpleSold],
            StockTaxLots = [simpleLot],
            DerivativeTrades = [],
            DerivativeTaxLots = [],
            Dividends = []
        )]

        utils = gu.GenericUtilities()

        results = utils.processGenericGroupings(groupings)

        assert len(results) == 1

