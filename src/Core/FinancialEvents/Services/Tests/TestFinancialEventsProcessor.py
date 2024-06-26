import arrow as ar

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.Grouping as pgf
import Core.FinancialEvents.Services.FinancialEventsProcessor as cgp
import Core.FinancialEvents.Utils.ProcessingUtils as pu
from Core.LotMatching.Services.LotMatcher import LotMatcher

simpleStockBuy = pgf.TradeEventStockAcquired(
    ID="StockBought",
    ISIN="US123",
    Ticker="AAPL",
    AssetClass=cf.GenericAssetClass.STOCK,
    Date=ar.get("2023-01-01"),
    Multiplier=1,
    AcquiredReason=cf.GenericTradeReportItemGainType.BOUGHT,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1,
        UnderlyingTradePrice=10,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
    ),
)


simpleStockSold = pgf.TradeEventStockSold(
    ID="StockSold",
    ISIN="US123",
    Ticker="AAPL",
    AssetClass=cf.GenericAssetClass.STOCK,
    Date=ar.get("2023-01-02"),
    Multiplier=1,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=-1,
        UnderlyingTradePrice=15,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
    ),
)


simpleStockLot = pgf.TaxLotStock(
    ID="Lot",
    ISIN="US123",
    Quantity=1,
    Acquired=simpleStockBuy,
    Sold=simpleStockSold,
    ShortLongType=cf.GenericShortLong.LONG,
)


class TestFinancialEventsProcessor:
    def testSingleStockLotMatching(self):
        grouping = pgf.FinancialGrouping(
            ISIN="US123",
            CountryOfOrigin="US",
            UnderlyingCategory=cf.GenericCategory.REGULAR,
            StockTrades=[simpleStockBuy, simpleStockSold],
            StockTaxLots=[simpleStockLot],
            DerivativeTrades=[],
            DerivativeTaxLots=[],
            CashTransactions=[],
        )

        utils = cgp.FinancialEventsProcessor(pu.ProcessingUtils(), LotMatcher())

        interesting = utils.generateInterestingUnderlyingGroupings([grouping])

        assert len(interesting) == 1, "There should only be one grouping generated when given one grouping"

        iGrouping = interesting[0]

        assert (
            len(iGrouping.StockTrades) == 2
        ), "There should only be 2 trades after matching trades with lots, as there were only 2 trades and 1 lot to which they belong to"
        assert (
            len(iGrouping.DerivativeTrades) == 0
        ), "There should be no derivative trades, since there were no derivative trades whatsoever"

    def testNoStockTradesMatching(self):
        grouping = pgf.FinancialGrouping(
            ISIN="US123",
            CountryOfOrigin="US",
            UnderlyingCategory=cf.GenericCategory.REGULAR,
            StockTrades=[simpleStockBuy, simpleStockSold],
            StockTaxLots=[],
            DerivativeTrades=[],
            DerivativeTaxLots=[],
            CashTransactions=[],
        )

        utils = cgp.FinancialEventsProcessor(pu.ProcessingUtils(), LotMatcher())

        interesting = utils.generateInterestingUnderlyingGroupings([grouping])

        assert len(interesting) == 1, "There should only be one grouping generated when given one grouping"

        iGrouping = interesting[0]

        assert len(iGrouping.StockTrades) == 0, "There should be no stock trades, since there were no trade lots matching them"
        assert (
            len(iGrouping.DerivativeTrades) == 0
        ), "There should be no derivative trades, since there were no derivative trades whatsoever"
