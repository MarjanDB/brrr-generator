import arrow as ar
import pytest

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.IdentifierRelationship as cir
import Core.StagingFinancialEvents.Schemas.FinancialIdentifier as sfi
from Core.StagingFinancialEvents.Schemas.IdentifierRelationship import (
    StagingIdentifierChangeType,
    StagingIdentifierRelationship,
    StagingIdentifierRelationships,
)
from Core.StagingFinancialEvents.Schemas.StagingFinancialEvents import StagingFinancialEvents
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventCashTransactionDividend,
    StagingTradeEventCashTransactionPaymentInLieuOfDividends,
    StagingTradeEventCashTransactionWitholdingTax,
    StagingTradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividends,
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
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
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
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
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


simpleStagingDividend = StagingTradeEventCashTransactionDividend(
    ID="Dividend",
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
    AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
    Date=ar.get("2023-01-01"),
    Multiplier=1,
    ActionID="ActionID",
    TransactionID="TransactionID",
    ListingExchange="ListingExchange",
    DividendType=cf.GenericDividendType.ORDINARY,
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

simpleStagingDividendWitholdingTax = StagingTradeEventCashTransactionWitholdingTax(
    ID="DividendWitholdingTax",
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
    AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
    Date=ar.get("2023-01-01"),
    Multiplier=1,
    ActionID="ActionID",
    TransactionID="TransactionID",
    ListingExchange="ListingExchange",
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1,
        UnderlyingTradePrice=-5,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
        FxRateToBase=1,
    ),
)


simpleStagingPaymentInLieuOfDividend = StagingTradeEventCashTransactionPaymentInLieuOfDividends(
    ID="PaymentInLieuOfDividend",
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
    AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
    Date=ar.get("2023-01-01"),
    Multiplier=1,
    ActionID="ActionID",
    TransactionID="TransactionID",
    ListingExchange="ListingExchange",
    DividendType=cf.GenericDividendType.ORDINARY,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1,
        UnderlyingTradePrice=5,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
        FxRateToBase=1,
    ),
)

simpleStagingPaymentInLieuOfDividendWitholdingTax = StagingTradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividends(
    ID="PaymentInLieuOfDividendWitholdingTax",
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
    AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
    Date=ar.get("2023-01-01"),
    Multiplier=1,
    ActionID="ActionID",
    TransactionID="TransactionID",
    ListingExchange="ListingExchange",
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1,
        UnderlyingTradePrice=-2.5,
        ComissionCurrency="EUR",
        ComissionTotal=0,
        TaxCurrency="EUR",
        TaxTotal=0,
        FxRateToBase=1,
    ),
)

simpleStagingStockLot = StagingTaxLot(
    ID="Lot",
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
    Quantity=1,
    Acquired=StagingTaxLotMatchingDetails(ID="StockBought", DateTime=None),
    Sold=StagingTaxLotMatchingDetails(ID=None, DateTime=ar.get("2023-01-02")),
    ShortLongType=cf.GenericShortLong.LONG,
)


simpleStagingDerivativeBuy = StagingTradeEventDerivativeAcquired(
    ID="DerivativeBought",
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
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
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
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
    FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
    Quantity=1,
    Acquired=StagingTaxLotMatchingDetails(ID="DerivativeBought", DateTime=None),
    Sold=StagingTaxLotMatchingDetails(ID=None, DateTime=ar.get("2023-01-02")),
    ShortLongType=cf.GenericShortLong.LONG,
)


class TestStagingFinancialGroupingProcessor:
    def testSimpleStockLotMatching(self):
        groupings = [
            StagingFinancialGrouping(
                FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
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
                FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
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
                FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
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

        assert results[0].DerivativeGroupings[0].DerivativeTaxLots[0].Acquired == results[0].DerivativeGroupings[0].DerivativeTrades[0]
        assert results[0].DerivativeGroupings[0].DerivativeTaxLots[0].Acquired.ExchangedMoney.UnderlyingQuantity == 1
        assert results[0].DerivativeGroupings[0].DerivativeTaxLots[0].Sold == results[0].DerivativeGroupings[0].DerivativeTrades[1]
        assert results[0].DerivativeGroupings[0].DerivativeTaxLots[0].Sold.ExchangedMoney.UnderlyingQuantity == -1

    def testDividendWithWitholdingTax(self):
        groupings = [
            StagingFinancialGrouping(
                FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
                CountryOfOrigin=None,
                UnderlyingCategory=cf.GenericCategory.REGULAR,
                StockTrades=[],
                StockTaxLots=[],
                DerivativeTrades=[],
                DerivativeTaxLots=[],
                CashTransactions=[
                    simpleStagingDividend,
                    simpleStagingDividendWitholdingTax,
                ],
            )
        ]

        utils = StagingFinancialGroupingProcessor(ProcessingUtils())

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert results[0].CashTransactions[0].ID == simpleStagingDividend.ID
        assert results[0].CashTransactions[1].ID == simpleStagingDividendWitholdingTax.ID

        assert results[0].CashTransactions[0].ExchangedMoney.UnderlyingQuantity == 1
        assert results[0].CashTransactions[1].ExchangedMoney.UnderlyingQuantity == 1

        assert results[0].CashTransactions[0].ExchangedMoney.UnderlyingTradePrice == 10
        assert results[0].CashTransactions[1].ExchangedMoney.UnderlyingTradePrice == -5

    def testPaymentInLieuOfDividendWithWitholdingTax(self):
        groupings = [
            StagingFinancialGrouping(
                FinancialIdentifier=sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
                CountryOfOrigin=None,
                UnderlyingCategory=cf.GenericCategory.REGULAR,
                StockTrades=[],
                StockTaxLots=[],
                DerivativeTrades=[],
                DerivativeTaxLots=[],
                CashTransactions=[
                    simpleStagingPaymentInLieuOfDividend,
                    simpleStagingPaymentInLieuOfDividendWitholdingTax,
                ],
            )
        ]

        utils = StagingFinancialGroupingProcessor(ProcessingUtils())

        results = utils.generateGenericGroupings(groupings)

        assert len(results) == 1

        assert results[0].CashTransactions[0].ID == simpleStagingPaymentInLieuOfDividend.ID
        assert results[0].CashTransactions[1].ID == simpleStagingPaymentInLieuOfDividendWitholdingTax.ID

        assert results[0].CashTransactions[0].ExchangedMoney.UnderlyingQuantity == 1
        assert results[0].CashTransactions[1].ExchangedMoney.UnderlyingQuantity == 1

        assert results[0].CashTransactions[0].ExchangedMoney.UnderlyingTradePrice == 5
        assert results[0].CashTransactions[1].ExchangedMoney.UnderlyingTradePrice == -2.5

    def testProcessStagingFinancialEventsReturnsFinancialEventsWithConvertedRelationships(self):
        stagingIdA = sfi.StagingFinancialIdentifier(ISIN="US111", Ticker="OLD", Name="Old")
        stagingIdB = sfi.StagingFinancialIdentifier(ISIN="US222", Ticker="NEW", Name="New")
        stagingRel = StagingIdentifierRelationship(
            FromIdentifier=stagingIdA,
            ToIdentifier=stagingIdB,
            ChangeType=StagingIdentifierChangeType.RENAME,
            EffectiveDate=ar.get("2024-06-01"),
        )
        groupings = [
            StagingFinancialGrouping(
                FinancialIdentifier=stagingIdA,
                CountryOfOrigin=None,
                UnderlyingCategory=cf.GenericCategory.REGULAR,
                StockTrades=[],
                StockTaxLots=[],
                DerivativeTrades=[],
                DerivativeTaxLots=[],
                CashTransactions=[],
            )
        ]
        events = StagingFinancialEvents(
            Groupings=groupings,
            IdentifierRelationships=StagingIdentifierRelationships(
                Relationships=(stagingRel,),
                PartialRelationships=(),
            ),
        )
        utils = StagingFinancialGroupingProcessor(ProcessingUtils())
        result = utils.processStagingFinancialEvents(events)
        assert hasattr(result, "Groupings")
        assert hasattr(result, "IdentifierRelationships")
        assert len(result.Groupings) == 1
        assert result.Groupings[0].FinancialIdentifier.getIsin() == "US111"
        assert len(result.IdentifierRelationships) == 1
        coreRel = result.IdentifierRelationships[0]
        assert coreRel.FromIdentifier.getIsin() == "US111"
        assert coreRel.ToIdentifier.getIsin() == "US222"
        assert coreRel.ChangeType == cir.IdentifierChangeType.RENAME
        assert coreRel.EffectiveDate is not None
