import arrow as ar
import pytest

import src.Core.FinancialEvents.GroupingProcessor.CountedGroupingProcessor as cgp
import src.Core.FinancialEvents.GroupingProcessor.StagingGroupingProcessor as sgp
import src.Core.FinancialEvents.Schemas.CommonFormats as cf
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Utils.ProcessingUtils as pu
from src.Core.LotMatching.Services.LotMatcher import LotMatcher
from src.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventDerivativeAcquired,
    StagingTradeEventDerivativeSold,
    StagingTradeEventStockAcquired,
    StagingTradeEventStockSold,
)
from src.StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping
from src.StagingFinancialEvents.Schemas.Lots import (
    StagingTaxLot,
    StagingTaxLotMatchingDetails,
)

simpleStagingStockBuy = StagingTradeEventStockAcquired(
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

simpleStockBuy = pgf.TradeEventStockAcquired(
    ID=simpleStagingStockBuy.ID,
    ISIN=simpleStagingStockBuy.ISIN,
    Ticker=simpleStagingStockBuy.Ticker or "AAPL",
    AssetClass=simpleStagingStockBuy.AssetClass,
    Date=simpleStagingStockBuy.Date,
    Multiplier=simpleStagingStockBuy.Multiplier,
    AcquiredReason=simpleStagingStockBuy.AcquiredReason,
    ExchangedMoney=simpleStagingStockBuy.ExchangedMoney,
)

simpleStagingStockSold = StagingTradeEventStockSold(
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

simpleStockSold = pgf.TradeEventStockSold(
    ID=simpleStagingStockSold.ID,
    ISIN=simpleStagingStockSold.ISIN,
    Ticker=simpleStagingStockSold.Ticker or "AAPL",
    AssetClass=simpleStagingStockSold.AssetClass,
    Date=simpleStagingStockSold.Date,
    Multiplier=simpleStagingStockSold.Multiplier,
    ExchangedMoney=simpleStagingStockSold.ExchangedMoney,
)

simpleStagingStockLot = StagingTaxLot(
    ID="Lot",
    Ticker="AAPL",
    ISIN="US123",
    Quantity=1,
    Acquired=StagingTaxLotMatchingDetails(ID="StockBought", DateTime=None),
    Sold=StagingTaxLotMatchingDetails(ID=None, DateTime=ar.get("2023-01-02")),
    ShortLongType=cf.GenericShortLong.LONG,
)

simpleStockLot = pgf.TradeTaxLotEventStock(
    ID=simpleStagingStockLot.ID,
    ISIN=simpleStagingStockLot.ISIN,
    Quantity=simpleStagingStockLot.Quantity,
    Acquired=simpleStockBuy,
    Sold=simpleStockSold,
    ShortLongType=simpleStagingStockLot.ShortLongType,
)


simpleStagingDerivativeBuy = StagingTradeEventDerivativeAcquired(
    ID="DerivativeBought",
    ISIN="US123",
    Ticker="AAPL",
    AssetClass=cf.GenericAssetClass.STOCK,
    Date=ar.get("2023-01-01"),
    Multiplier=100,
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

simpleStagingDerivativeSold = StagingTradeEventDerivativeSold(
    ID="DerivativeSold",
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

simpleStagingDerivativeLot = StagingTaxLot(
    ID="Lot",
    ISIN="US123",
    Ticker="AAPL",
    Quantity=1,
    Acquired=StagingTaxLotMatchingDetails(ID="DerivativeBought", DateTime=None),
    Sold=StagingTaxLotMatchingDetails(ID=None, DateTime=ar.get("2023-01-02")),
    ShortLongType=cf.GenericShortLong.LONG,
)


class TestGenericGroupingsProcessing:
    def testSimpleStockLotMatching(self):
        groupings = [
            StagingFinancialGrouping(
                ISIN="US123",
                CountryOfOrigin=None,
                UnderlyingCategory=cf.GenericCategory.REGULAR,
                StockTrades=[simpleStagingStockBuy, simpleStagingStockSold],
                StockTaxLots=[simpleStagingStockLot],
                DerivativeTrades=[],
                DerivativeTaxLots=[],
                CashTransactions=[],
            )
        ]

        utils = sgp.StagingGroupingProcessor(pu.ProcessingUtils())

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert results[0].StockTaxLots[0].Acquired == results[0].StockTrades[0]
        assert results[0].StockTaxLots[0].Acquired.ExchangedMoney.UnderlyingQuantity == 1
        assert results[0].StockTaxLots[0].Sold == results[0].StockTrades[1]
        assert results[0].StockTaxLots[0].Sold.ExchangedMoney.UnderlyingQuantity == -1

    def testPartialStockLotMatching(self):
        groupings = [
            StagingFinancialGrouping(
                ISIN="US123",
                CountryOfOrigin=None,
                UnderlyingCategory=cf.GenericCategory.REGULAR,
                StockTrades=[simpleStagingStockBuy],
                StockTaxLots=[simpleStagingStockLot],
                DerivativeTrades=[],
                DerivativeTaxLots=[],
                CashTransactions=[],
            )
        ]

        utils = sgp.StagingGroupingProcessor(pu.ProcessingUtils())

        with pytest.raises(LookupError):
            utils.generateGenericGroupings(groupings)

    def testSimpleDerivativeLotMatching(self):
        groupings = [
            StagingFinancialGrouping(
                ISIN="US123",
                CountryOfOrigin=None,
                UnderlyingCategory=cf.GenericCategory.REGULAR,
                StockTrades=[],
                StockTaxLots=[],
                DerivativeTrades=[
                    simpleStagingDerivativeBuy,
                    simpleStagingDerivativeSold,
                ],
                DerivativeTaxLots=[simpleStagingDerivativeLot],
                CashTransactions=[],
            )
        ]

        utils = sgp.StagingGroupingProcessor(pu.ProcessingUtils())

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert results[0].DerivativeTaxLots[0].Acquired == results[0].DerivativeTrades[0]
        assert results[0].DerivativeTaxLots[0].Acquired.ExchangedMoney.UnderlyingQuantity == 1
        assert results[0].DerivativeTaxLots[0].Sold == results[0].DerivativeTrades[1]
        assert results[0].DerivativeTaxLots[0].Sold.ExchangedMoney.UnderlyingQuantity == -1


class TestInterestingGroupingsProcessing:
    def testSingleStockLotMatching(self):
        grouping = pgf.UnderlyingGrouping(
            ISIN="US123",
            CountryOfOrigin="US",
            UnderlyingCategory=cf.GenericCategory.REGULAR,
            StockTrades=[simpleStockBuy, simpleStockSold],
            StockTaxLots=[simpleStockLot],
            DerivativeTrades=[],
            DerivativeTaxLots=[],
            CashTransactions=[],
        )

        utils = cgp.CountedGroupingProcessor(pu.ProcessingUtils(), LotMatcher())

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
        grouping = pgf.UnderlyingGrouping(
            ISIN="US123",
            CountryOfOrigin="US",
            UnderlyingCategory=cf.GenericCategory.REGULAR,
            StockTrades=[simpleStockBuy, simpleStockSold],
            StockTaxLots=[],
            DerivativeTrades=[],
            DerivativeTaxLots=[],
            CashTransactions=[],
        )

        utils = cgp.CountedGroupingProcessor(pu.ProcessingUtils(), LotMatcher())

        interesting = utils.generateInterestingUnderlyingGroupings([grouping])

        assert len(interesting) == 1, "There should only be one grouping generated when given one grouping"

        iGrouping = interesting[0]

        assert len(iGrouping.StockTrades) == 0, "There should be no stock trades, since there were no trade lots matching them"
        assert (
            len(iGrouping.DerivativeTrades) == 0
        ), "There should be no derivative trades, since there were no derivative trades whatsoever"
