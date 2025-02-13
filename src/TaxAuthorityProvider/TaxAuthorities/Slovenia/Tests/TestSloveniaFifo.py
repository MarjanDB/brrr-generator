import arrow
from lxml import etree

import ConfigurationProvider.Configuration as cpc
import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.Grouping as pgf
import TaxAuthorityProvider.Schemas.Configuration as tapc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.ReportTypes as rt
import TaxAuthorityProvider.TaxAuthorities.Slovenia.SlovenianTaxAuthorityProvider as tap

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


stockAcquired = pgf.TradeEventStockAcquired(
    ID="ID1",
    ISIN="ISIN",
    Ticker="Ticker",
    AssetClass=cf.GenericAssetClass.STOCK,
    Date=arrow.get("2023-06-06"),
    Multiplier=1.0,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1.0,
        UnderlyingTradePrice=1.0,
        ComissionCurrency="EUR",
        ComissionTotal=0.0,
        TaxCurrency="EUR",
        TaxTotal=0.0,
        FxRateToBase=1,
    ),
    AcquiredReason=cf.GenericTradeReportItemGainType.BOUGHT,
)

stockSold = pgf.TradeEventStockSold(
    ID="ID2",
    ISIN="ISIN",
    Ticker="Ticker",
    AssetClass=cf.GenericAssetClass.STOCK,
    Date=arrow.get("2023-06-07"),
    Multiplier=1.0,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=-1.0,
        UnderlyingTradePrice=1.0,
        ComissionCurrency="EUR",
        ComissionTotal=0.0,
        TaxCurrency="EUR",
        TaxTotal=0.0,
        FxRateToBase=1,
    ),
)

optionBought = pgf.TradeEventDerivativeAcquired(
    ID="ID1",
    ISIN="ISIN",
    Ticker="Ticker",
    AcquiredReason=cf.GenericDerivativeReportItemGainType.BOUGHT,
    AssetClass=cf.GenericAssetClass.OPTION,
    Date=arrow.get("2023-06-07"),
    Multiplier=100,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=1.0,
        UnderlyingTradePrice=1.0,
        ComissionCurrency="EUR",
        ComissionTotal=0.0,
        TaxCurrency="EUR",
        TaxTotal=0.0,
        FxRateToBase=1,
    ),
)

optionSold = pgf.TradeEventDerivativeSold(
    ID="ID2",
    ISIN="ISIN",
    Ticker="Ticker",
    AssetClass=cf.GenericAssetClass.OPTION,
    Date=arrow.get("2023-06-08"),
    Multiplier=100,
    ExchangedMoney=cf.GenericMonetaryExchangeInformation(
        UnderlyingCurrency="EUR",
        UnderlyingQuantity=-1.0,
        UnderlyingTradePrice=1.5,
        ComissionCurrency="EUR",
        ComissionTotal=0.0,
        TaxCurrency="EUR",
        TaxTotal=0.0,
        FxRateToBase=1,
    ),
)


testData = pgf.FinancialGrouping(
    GroupingIdentity=pgf.FinancialGroupingIdentifier(ISIN="ISIN"),
    ISIN="ISIN",
    CountryOfOrigin=None,
    UnderlyingCategory=cf.GenericCategory.REGULAR,
    StockTrades=[stockAcquired, stockSold],
    StockTaxLots=[],
    DerivativeTrades=[optionBought, optionSold],
    DerivativeTaxLots=[],
    CashTransactions=[],
)


class TestSloveniaFifo:
    def testKdvpSimpleCsv(self):
        config = tapc.TaxAuthorityConfiguration(arrow.get("2023"), arrow.get("2024"), tapc.TaxAuthorityLotMatchingMethod.FIFO)

        provider = tap.SlovenianTaxAuthorityProvider(taxPayerInfo=simpleTaxPayer, reportConfig=config)

        export = provider.generateSpreadsheetExport(rt.SlovenianTaxAuthorityReportTypes.DOH_KDVP, [testData])

        assert export.shape[0] == 2, "Only 2 rows should be present"
        assert export["Quantity"][0] == 1, "The first line should be the buy line"
        assert export["Quantity"][1] == -1, "The second line should be the sell line"

    def testKdvpSimpleXml(self):
        config = tapc.TaxAuthorityConfiguration(arrow.get("2023"), arrow.get("2024"), tapc.TaxAuthorityLotMatchingMethod.FIFO)
        provider = tap.SlovenianTaxAuthorityProvider(taxPayerInfo=simpleTaxPayer, reportConfig=config)

        export = provider.generateExportForTaxAuthority(rt.SlovenianTaxAuthorityReportTypes.DOH_KDVP, [testData])

        tradePurchaseFinder = etree.XPath("/Envelope/body/Doh_KDVP/KDVPItem/Securities/Row/Purchase")
        tradeSaleFinder = etree.XPath("/Envelope/body/Doh_KDVP/KDVPItem/Securities/Row/Sale")
        purchaseNodes = tradePurchaseFinder(export)
        saleNodes = tradeSaleFinder(export)

        assert len(purchaseNodes) == 1, "There should only be one purchase"
        assert len(saleNodes) == 1, "There should only be one sale"

        assert purchaseNodes[0].getchildren()[2].text == "1.0", "The purchase's 3rd F3 element should contain a positive Quantity"
        assert saleNodes[0].getchildren()[1].text == "1.0", "The sale's 3rd F3 element should contain a positive Quantity"

    def testIfiSimpleCsv(self):
        config = tapc.TaxAuthorityConfiguration(arrow.get("2023"), arrow.get("2024"), tapc.TaxAuthorityLotMatchingMethod.FIFO)

        provider = tap.SlovenianTaxAuthorityProvider(taxPayerInfo=simpleTaxPayer, reportConfig=config)

        export = provider.generateSpreadsheetExport(rt.SlovenianTaxAuthorityReportTypes.D_IFI, [testData])

        assert export.shape[0] == 2, "Only 2 rows should be present"
        assert export["Quantity"][0] == 1, "The first line should be the buy line"
        assert export["Quantity"][1] == -1, "The second line should be the sell line"

    def testIfiSimpleXml(self):
        config = tapc.TaxAuthorityConfiguration(arrow.get("2023"), arrow.get("2024"), tapc.TaxAuthorityLotMatchingMethod.FIFO)
        provider = tap.SlovenianTaxAuthorityProvider(taxPayerInfo=simpleTaxPayer, reportConfig=config)

        export = provider.generateExportForTaxAuthority(rt.SlovenianTaxAuthorityReportTypes.D_IFI, [testData])

        tradePurchaseFinder = etree.XPath("/Envelope/body/D_IFI/TItem/TSubItem/Purchase")
        tradeSaleFinder = etree.XPath("/Envelope/body/D_IFI/TItem/TSubItem/Sale")
        purchaseNodes = tradePurchaseFinder(export)
        saleNodes = tradeSaleFinder(export)

        assert len(purchaseNodes) == 1, "There should only be one purchase"
        assert len(saleNodes) == 1, "There should only be one sale"

        assert purchaseNodes[0].getchildren()[2].text == "1.0", "The purchase's 3rd F3 element should contain a positive Quantity"
        assert saleNodes[0].getchildren()[1].text == "1.0", "The sale's 2nd F6 element should contain a positive Quantity"
