import arrow

import ConfigurationProvider.Configuration as cpc
import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.Grouping as pgf
import TaxAuthorityProvider.Schemas.Configuration as tapc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.ReportTypes as rt
import TaxAuthorityProvider.TaxAuthorities.Slovenia.SlovenianTaxAuthorityProvider as tap
from Core.FinancialEvents.Schemas.Events import (
    TradeEventCashTransactionDividend,
    TradeEventCashTransactionPaymentInLieuOfDividend,
    TradeEventCashTransactionWitholdingTax,
    TradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividend,
)

simpleTaxPayer = cpc.TaxPayerInfo(
    taxNumber="taxNumber",
    taxpayerType=cpc.TaxPayerType.PHYSICAL_SUBJECT,
    name="name",
    address1="address1",
    address2="address2",
    city="city",
    postNumber="postNumber",
    postName="postName",
    municipalityName="municipality",
    birthDate=arrow.get("2000"),
    maticnaStevilka="maticna",
    invalidskoPodjetje=False,
    resident=True,
    activityCode="",
    activityName="",
    countryID="SI",
    countryName="Slovenia",
)

cashTransactionDividend = TradeEventCashTransactionDividend(
    ID="ID",
    ISIN="ISIN",
    Ticker="Ticker",
    AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
    Date=arrow.get("2023-06-07"),
    Multiplier=1,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1.0,
        UnderlyingTradePrice=10.0,
        ComissionCurrency="EUR",
        ComissionTotal=0.0,
        TaxCurrency="EUR",
        TaxTotal=0.0,
        FxRateToBase=1,
    ),
    ActionID="DivAction",
    TransactionID="TranId1",
    ListingExchange="EXH",
    DividendType=cf.GenericDividendType.ORDINARY,
)

cashTransactionPaymentInLieuOfDividend = TradeEventCashTransactionPaymentInLieuOfDividend(
    ID="ID",
    ISIN="ISIN",
    Ticker="Ticker",
    AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
    Date=arrow.get("2023-06-07"),
    Multiplier=1,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1.0,
        UnderlyingTradePrice=5.0,
        ComissionCurrency="EUR",
        ComissionTotal=0.0,
        TaxCurrency="EUR",
        TaxTotal=0.0,
        FxRateToBase=1,
    ),
    ActionID="DivAction",
    TransactionID="TranId2",
    ListingExchange="EXH",
    DividendType=cf.GenericDividendType.ORDINARY,
)

cashTransactionDividendWitholdingTax = TradeEventCashTransactionWitholdingTax(
    ID="ID",
    ISIN="ISIN",
    Ticker="Ticker",
    AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
    Date=arrow.get("2023-06-07"),
    Multiplier=1,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1.0,
        UnderlyingTradePrice=-5.0,
        ComissionCurrency="EUR",
        ComissionTotal=0.0,
        TaxCurrency="EUR",
        TaxTotal=0.0,
        FxRateToBase=1,
    ),
    ActionID="DivAction",
    TransactionID="TranId3",
    ListingExchange="EXH",
)

cashTransactionPaymentInLieuOfDividendWitholdingTax = TradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividend(
    ID="ID",
    ISIN="ISIN",
    Ticker="Ticker",
    AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
    Date=arrow.get("2023-06-07"),
    Multiplier=1,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1.0,
        UnderlyingTradePrice=-2.5,
        ComissionCurrency="EUR",
        ComissionTotal=0.0,
        TaxCurrency="EUR",
        TaxTotal=0.0,
        FxRateToBase=1,
    ),
    ActionID="DivAction",
    TransactionID="TranId4",
    ListingExchange="EXH",
)

testData = pgf.FinancialGrouping(
    ISIN="ISIN",
    CountryOfOrigin=None,
    UnderlyingCategory=cf.GenericCategory.REGULAR,
    StockTrades=[],
    StockTaxLots=[],
    DerivativeTrades=[],
    DerivativeTaxLots=[],
    CashTransactions=[
        cashTransactionDividend,
        cashTransactionPaymentInLieuOfDividend,
        cashTransactionDividendWitholdingTax,
        cashTransactionPaymentInLieuOfDividendWitholdingTax,
    ],
)


class TestPaymentInLieuOfDividend:
    def testThatWitholdingTaxForPaymentInLieuOfDividendIsNotReportedAsDividendWitholdingTax(self):
        config = tapc.TaxAuthorityConfiguration(arrow.get("2023"), arrow.get("2024"))

        provider = tap.SlovenianTaxAuthorityProvider(taxPayerInfo=simpleTaxPayer, reportConfig=config)

        export = provider.generateSpreadsheetExport(rt.SlovenianTaxAuthorityReportTypes.DOH_DIV, [testData])

        assert (
            export.shape[0] == 1
        ), "Only 1 row should be present, as there's one unique dividend event and one payment in lieu of dividend event"

        assert export["Znesek dividend (v EUR)"][0] == 10.0, "The dividend should equal the dividend event"
        assert (
            export["Tuji davek (v EUR)"][0] == 5.0
        ), "The witholding tax should only be taken from the witholding tax event for the dividend, not the payment in lieu of dividend event"
