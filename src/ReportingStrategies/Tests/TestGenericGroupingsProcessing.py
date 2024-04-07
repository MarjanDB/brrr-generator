import arrow as ar
import pytest

import src.ReportingStrategies.GenericFormats as gf
import src.ReportingStrategies.GenericUtilities as gu

simpleStagingStockBuy = gf.TradeEventStagingStockAcquired(
    ID="StockBought",
    ISIN="US123",
    Ticker="AAPL",
    AssetClass=gf.GenericAssetClass.STOCK,
    Date=ar.get("2023-01-01"),
    Multiplier=1,
    AcquiredReason=gf.GenericTradeReportItemGainType.BOUGHT,
    ExchangedMoney=gf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1,
        UnderlyingTradePrice=10,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
    ),
)

simpleStockBuy = gf.TradeEventStockAcquired(
    ID=simpleStagingStockBuy.ID,
    ISIN=simpleStagingStockBuy.ISIN,
    Ticker=simpleStagingStockBuy.Ticker or "AAPL",
    AssetClass=simpleStagingStockBuy.AssetClass,
    Date=simpleStagingStockBuy.Date,
    Multiplier=simpleStagingStockBuy.Multiplier,
    AcquiredReason=simpleStagingStockBuy.AcquiredReason,
    ExchangedMoney=simpleStagingStockBuy.ExchangedMoney,
)

simpleStagingStockSold = gf.TradeEventStagingStockSold(
    ID="StockSold",
    ISIN="US123",
    Ticker="AAPL",
    AssetClass=gf.GenericAssetClass.STOCK,
    Date=ar.get("2023-01-02"),
    Multiplier=1,
    ExchangedMoney=gf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=-1,
        UnderlyingTradePrice=15,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
    ),
)

simpleStockSold = gf.TradeEventStockSold(
    ID=simpleStagingStockSold.ID,
    ISIN=simpleStagingStockSold.ISIN,
    Ticker=simpleStagingStockSold.Ticker or "AAPL",
    AssetClass=simpleStagingStockSold.AssetClass,
    Date=simpleStagingStockSold.Date,
    Multiplier=simpleStagingStockSold.Multiplier,
    ExchangedMoney=simpleStagingStockSold.ExchangedMoney,
)

simpleStagingStockLot = gf.GenericTaxLotEventStaging(
    ID="Lot",
    Ticker="AAPL",
    ISIN="US123",
    Quantity=1,
    Acquired=gf.GenericTaxLotMatchingDetails(ID="StockBought", DateTime=None),
    Sold=gf.GenericTaxLotMatchingDetails(ID=None, DateTime=ar.get("2023-01-02")),
    ShortLongType=gf.GenericShortLong.LONG,
)

simpleStockLot = gf.TradeTaxLotEventStock(
    ID=simpleStagingStockLot.ID,
    ISIN=simpleStagingStockLot.ISIN,
    Quantity=simpleStagingStockLot.Quantity,
    Acquired=simpleStockBuy,
    Sold=simpleStockSold,
    ShortLongType=simpleStagingStockLot.ShortLongType,
)


simpleStagingDerivativeBuy = gf.TradeEventStagingDerivativeAcquired(
    ID="DerivativeBought",
    ISIN="US123",
    Ticker="AAPL",
    AssetClass=gf.GenericAssetClass.STOCK,
    Date=ar.get("2023-01-01"),
    Multiplier=100,
    AcquiredReason=gf.GenericTradeReportItemGainType.BOUGHT,
    ExchangedMoney=gf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1,
        UnderlyingTradePrice=10,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
    ),
)

simpleStagingDerivativeSold = gf.TradeEventStagingDerivativeSold(
    ID="DerivativeSold",
    ISIN="US123",
    Ticker="AAPL",
    AssetClass=gf.GenericAssetClass.STOCK,
    Date=ar.get("2023-01-02"),
    Multiplier=1,
    ExchangedMoney=gf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=-1,
        UnderlyingTradePrice=15,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
    ),
)

simpleStagingDerivativeLot = gf.GenericTaxLotEventStaging(
    ID="Lot",
    ISIN="US123",
    Ticker="AAPL",
    Quantity=1,
    Acquired=gf.GenericTaxLotMatchingDetails(ID="DerivativeBought", DateTime=None),
    Sold=gf.GenericTaxLotMatchingDetails(ID=None, DateTime=ar.get("2023-01-02")),
    ShortLongType=gf.GenericShortLong.LONG,
)


class TestGenericGroupingsProcessing:
    def testSimpleStockLotMatching(self):
        groupings = [
            gf.GenericUnderlyingGroupingStaging(
                ISIN="US123",
                CountryOfOrigin=None,
                UnderlyingCategory=gf.GenericCategory.REGULAR,
                StockTrades=[simpleStagingStockBuy, simpleStagingStockSold],
                StockTaxLots=[simpleStagingStockLot],
                DerivativeTrades=[],
                DerivativeTaxLots=[],
                Dividends=[],
            )
        ]

        utils = gu.GenericUtilities()

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert results[0].StockTaxLots[0].Acquired == results[0].StockTrades[0]
        assert (
            results[0].StockTaxLots[0].Acquired.ExchangedMoney.UnderlyingQuantity == 1
        )
        assert results[0].StockTaxLots[0].Sold == results[0].StockTrades[1]
        assert results[0].StockTaxLots[0].Sold.ExchangedMoney.UnderlyingQuantity == -1

    def testPartialStockLotMatching(self):
        groupings = [
            gf.GenericUnderlyingGroupingStaging(
                ISIN="US123",
                CountryOfOrigin=None,
                UnderlyingCategory=gf.GenericCategory.REGULAR,
                StockTrades=[simpleStagingStockBuy],
                StockTaxLots=[simpleStagingStockLot],
                DerivativeTrades=[],
                DerivativeTaxLots=[],
                Dividends=[],
            )
        ]

        utils = gu.GenericUtilities()

        with pytest.raises(LookupError):
            utils.generateGenericGroupings(groupings)

    def testSimpleDerivativeLotMatching(self):
        groupings = [
            gf.GenericUnderlyingGroupingStaging(
                ISIN="US123",
                CountryOfOrigin=None,
                UnderlyingCategory=gf.GenericCategory.REGULAR,
                StockTrades=[],
                StockTaxLots=[],
                DerivativeTrades=[
                    simpleStagingDerivativeBuy,
                    simpleStagingDerivativeSold,
                ],
                DerivativeTaxLots=[simpleStagingDerivativeLot],
                Dividends=[],
            )
        ]

        utils = gu.GenericUtilities()

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert (
            results[0].DerivativeTaxLots[0].Acquired == results[0].DerivativeTrades[0]
        )
        assert (
            results[0].DerivativeTaxLots[0].Acquired.ExchangedMoney.UnderlyingQuantity
            == 1
        )
        assert results[0].DerivativeTaxLots[0].Sold == results[0].DerivativeTrades[1]
        assert (
            results[0].DerivativeTaxLots[0].Sold.ExchangedMoney.UnderlyingQuantity == -1
        )


class TestInterestingGroupingsProcessing:
    def testSingleStockLotMatching(self):
        grouping = gf.UnderlyingGrouping(
            ISIN="US123",
            CountryOfOrigin="US",
            UnderlyingCategory=gf.GenericCategory.REGULAR,
            StockTrades=[simpleStockBuy, simpleStockSold],
            StockTaxLots=[simpleStockLot],
            DerivativeTrades=[],
            DerivativeTaxLots=[],
            Dividends=[],
        )

        utils = gu.GenericUtilities()

        interesting = utils.generateInterestingUnderlyingGroupings([grouping])

        assert (
            len(interesting) == 1
        ), "There should only be one grouping generated when given one grouping"

        iGrouping = interesting[0]

        assert (
            len(iGrouping.StockTrades) == 2
        ), "There should only be 2 trades after matching trades with lots, as there were only 2 trades and 1 lot to which they belong to"
        assert (
            len(iGrouping.DerivativeTrades) == 0
        ), "There should be no derivative trades, since there were no derivative trades whatsoever"

    def testNoStockTradesMatching(self):
        grouping = gf.UnderlyingGrouping(
            ISIN="US123",
            CountryOfOrigin="US",
            UnderlyingCategory=gf.GenericCategory.REGULAR,
            StockTrades=[simpleStockBuy, simpleStockSold],
            StockTaxLots=[],
            DerivativeTrades=[],
            DerivativeTaxLots=[],
            Dividends=[],
        )

        utils = gu.GenericUtilities()

        interesting = utils.generateInterestingUnderlyingGroupings([grouping])

        assert (
            len(interesting) == 1
        ), "There should only be one grouping generated when given one grouping"

        iGrouping = interesting[0]

        assert (
            len(iGrouping.StockTrades) == 0
        ), "There should be no stock trades, since there were no trade lots matching them"
        assert (
            len(iGrouping.DerivativeTrades) == 0
        ), "There should be no derivative trades, since there were no derivative trades whatsoever"
