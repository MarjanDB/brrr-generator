import arrow as ar
import pytest

import Core.FinancialEvents.Schemas.CommonFormats as cf
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventDerivativeAcquired,
    StagingTradeEventDerivativeSold,
    StagingTradeEventStockAcquired,
    StagingTradeEventStockSold,
)
from Core.StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping
from Core.StagingFinancialEvents.Schemas.Lots import (
    StagingTaxLot,
    StagingTaxLotMatchingDetails,
)
from Core.StagingFinancialEvents.Services.StagingFinancialGroupingProcessor import (
    StagingFinancialGroupingProcessor,
)
from Core.StagingFinancialEvents.Utils.ProcessingUtils import ProcessingUtils

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
        FxRateToBase=1,
    ),
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
        FxRateToBase=1,
    ),
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


simpleStagingDerivativeBuy = StagingTradeEventDerivativeAcquired(
    ID="DerivativeBought",
    ISIN="US123",
    Ticker="AAPL",
    AssetClass=cf.GenericAssetClass.STOCK,
    Date=ar.get("2023-01-01"),
    Multiplier=100,
    AcquiredReason=cf.GenericDerivativeReportItemGainType.BOUGHT,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1,
        UnderlyingTradePrice=10,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
        FxRateToBase=1,
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
        FxRateToBase=1,
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


class TestStagingFinancialGroupingProcessor:
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

        utils = StagingFinancialGroupingProcessor(ProcessingUtils())

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

        utils = StagingFinancialGroupingProcessor(ProcessingUtils())

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

        utils = StagingFinancialGroupingProcessor(ProcessingUtils())

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert results[0].DerivativeTaxLots[0].Acquired == results[0].DerivativeTrades[0]
        assert results[0].DerivativeTaxLots[0].Acquired.ExchangedMoney.UnderlyingQuantity == 1
        assert results[0].DerivativeTaxLots[0].Sold == results[0].DerivativeTrades[1]
        assert results[0].DerivativeTaxLots[0].Sold.ExchangedMoney.UnderlyingQuantity == -1
