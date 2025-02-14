import arrow as ar

import BrokerageExportProviders.Brokerages.IBKR.Schemas.Schemas as es
import BrokerageExportProviders.Brokerages.IBKR.Schemas.SegmentedTrades as st
import BrokerageExportProviders.Brokerages.IBKR.Transforms.Transform as t
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventCashTransactionDividend,
    StagingTradeEventCashTransactionPaymentInLieuOfDividends,
    StagingTradeEventCashTransactionWitholdingTax,
    StagingTradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividends,
)

simpleTradeBuy = es.TradeStock(
    ClientAccountID="test",
    Currency="EUR",
    FXRateToBase=1,
    AssetClass=es.AssetClass.STOCK,
    SubCategory=es.SubCategory.COMMON,
    Symbol="TEST",
    Description="",
    Conid="conid",
    SecurityID="securityid",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP="cusip",
    ISIN="US21212112",
    FIGI="FIGI2121312",
    ListingExchange="NYSE",
    ReportDate=ar.get("2023-01-01"),
    DateTime=ar.get("2023-01-01T13:00:15"),
    TradeDate=ar.get("2023-01-01"),
    TransactionType=es.TransactionType.EXCHANGE_TRADE,
    Exchange="EXCHA",
    Quantity=2,
    TradePrice=15,
    TradeMoney=30,
    Proceeds=1,
    Taxes=0,
    IBCommission=2,
    IBCommissionCurrency="EUR",
    NetCash=-33,
    NetCashInBase=-33,
    ClosePrice=15,
    OpenCloseIndicator=es.OpenCloseIndicator.OPEN,
    NotesAndCodes=[es.Codes.OPENING_TRADE],
    CostBasis=33,
    FifoProfitAndLossRealized=0,
    CapitalGainsProfitAndLoss=0,
    ForexProfitAndLoss=0,
    MarketToMarketProfitAndLoss=0,
    BuyOrSell=es.BuyOrSell.BUY,
    TransactionID="ID",
    OrderTime=ar.get("2023-01-01T13:00:02"),
    LevelOfDetail=es.LevelOfDetail.EXECUTION,
    ChangeInPrice=0,
    ChangeInQuantity=2,
    OrderType=es.OrderType.LIMIT,
    AccruedInterest=0,
)

simpleTradeSell = es.TradeStock(
    ClientAccountID="test",
    Currency="EUR",
    FXRateToBase=1,
    AssetClass=es.AssetClass.STOCK,
    SubCategory=es.SubCategory.COMMON,
    Symbol="TEST",
    Description="",
    Conid="conid",
    SecurityID="securityid",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP="cusip",
    ISIN="US21212112",
    FIGI="FIGI2121312",
    ListingExchange="NYSE",
    ReportDate=ar.get("2023-01-01"),
    DateTime=ar.get("2023-01-01T13:00:15"),
    TradeDate=ar.get("2023-01-01"),
    TransactionType=es.TransactionType.EXCHANGE_TRADE,
    Exchange="EXCHA",
    Quantity=-2,
    TradePrice=-15,
    TradeMoney=-30,
    Proceeds=1,
    Taxes=0,
    IBCommission=2,
    IBCommissionCurrency="EUR",
    NetCash=33,
    NetCashInBase=33,
    ClosePrice=15,
    OpenCloseIndicator=es.OpenCloseIndicator.CLOSE,
    NotesAndCodes=[es.Codes.OPENING_TRADE],
    CostBasis=33,
    FifoProfitAndLossRealized=0,
    CapitalGainsProfitAndLoss=0,
    ForexProfitAndLoss=0,
    MarketToMarketProfitAndLoss=0,
    BuyOrSell=es.BuyOrSell.SELL,
    TransactionID="ID2",
    OrderTime=ar.get("2023-01-01T13:00:02"),
    LevelOfDetail=es.LevelOfDetail.EXECUTION,
    ChangeInPrice=0,
    ChangeInQuantity=2,
    OrderType=es.OrderType.LIMIT,
    AccruedInterest=0,
)


simpleStockLot = es.LotStock(
    ClientAccountID="test",
    Currency="EUR",
    FXRateToBase=1,
    AssetClass=es.AssetClass.STOCK,
    SubCategory=es.SubCategory.COMMON,
    Symbol="TEST",
    Description="",
    Conid="conid",
    SecurityID="securityid",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP="cusip",
    ISIN="US21212112",
    FIGI="FIGI2121312",
    ListingExchange="NYSE",
    Multiplier=1,
    ReportDate=ar.get("2023-01-05"),
    DateTime=ar.get("2023-01-05T13:00:15"),
    TradeDate=ar.get("2023-01-05"),
    Exchange="EXCHA",
    Quantity=2,
    TradePrice=15,
    OpenCloseIndicator=es.OpenCloseIndicator.CLOSE,
    NotesAndCodes=[es.Codes.CLOSING_TRADE],
    CostBasis=33,
    FifoProfitAndLossRealized=5,
    CapitalGainsProfitAndLoss=5,
    ForexProfitAndLoss=0,
    BuyOrSell=es.BuyOrSell.SELL,
    TransactionID="ID",
    OpenDateTime=ar.get("2023-01-01T13:00:15"),
    HoldingPeriodDateTime=ar.get("2023-01-01T13:00:15"),
    LevelOfDetail=es.LevelOfDetail.CLOSED_LOT,
)


class TestIbkrTransformStock:
    def testSingleStockTrade(self):
        segmented = st.SegmentedTrades(
            cashTransactions=[],
            corporateActions=[],
            stockTrades=[simpleTradeBuy],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1, "Given a single trade, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.FinancialIdentifier.getIsin() == "US21212112", "Underlying group ISIN should match the trade ISIN"
        assert extracted.StockTrades[0].FinancialIdentifier.getIsin() == "US21212112", "The trade ISIN should match the ISIN of the group"
        assert extracted.StockTrades[0].ExchangedMoney.UnderlyingQuantity == 2, "The trade quantity should be 2"

    def testSingleStockTradeSell(self):
        segmented = st.SegmentedTrades(
            cashTransactions=[],
            corporateActions=[],
            stockTrades=[simpleTradeSell],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1, "Given a single trade, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.FinancialIdentifier.getIsin() == "US21212112", "Underlying group ISIN should match the trade ISIN"
        assert extracted.StockTrades[0].FinancialIdentifier.getIsin() == "US21212112", "The trade ISIN should match the ISIN of the group"
        assert extracted.StockTrades[0].ExchangedMoney.UnderlyingQuantity == -2, "The trade quantity should be -2"

    def testSingleStockLot(self):
        segmented = st.SegmentedTrades(
            cashTransactions=[],
            corporateActions=[],
            stockTrades=[],
            stockLots=[simpleStockLot],
            derivativeTrades=[],
            derivativeLots=[],
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1, "Given a single trade, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.FinancialIdentifier.getIsin() == "US21212112", "Underlying group ISIN should match the lot ISIN"
        assert extracted.StockTaxLots[0].FinancialIdentifier.getIsin() == "US21212112", "The lot ISIN should match the ISIN of the group"

    # TODO: Add test for groupby, where the trade events are ISIN1, ISIN2, ISIN1


dividend = es.TransactionCash(
    ClientAccountID="FakeAccount",
    Currency="USD",
    FXRateToBase=1.2,
    AssetClass=es.AssetClass.CASH,
    SubCategory=es.SubCategory.COMMON,
    Symbol="TTE",
    Description="TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE (Ordinary Dividend)",
    Conid="29612193",
    SecurityID="FR0000120271",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP=None,
    ISIN="FR0000120271",
    FIGI=None,
    ListingExchange="SBF",
    DateTime=ar.get("2023-01-01T02:00:00"),
    SettleDate=ar.get("2023-01-01"),
    Amount=2.64,
    Type=es.CashTransactionType.DIVIDEND,
    Code=None,
    TransactionID="269176073",
    ReportDate=ar.get("2023-01-01"),
    ActionID="102869793",
)

witholdingTaxForDividend = es.TransactionCash(
    ClientAccountID="FakeAccount",
    Currency="USD",
    FXRateToBase=1.2,
    AssetClass=es.AssetClass.CASH,
    SubCategory=es.SubCategory.COMMON,
    Symbol="TTE",
    Description="TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE - FR TAX",
    Conid="29612193",
    SecurityID="FR0000120271",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP=None,
    ISIN="FR0000120271",
    FIGI=None,
    ListingExchange="SBF",
    DateTime=ar.get("2023-01-01T02:00:00"),
    SettleDate=ar.get("2023-01-01"),
    Amount=-0.66,
    Type=es.CashTransactionType.WITHOLDING_TAX,
    Code=None,
    TransactionID="323614082",
    ReportDate=ar.get("2023-01-01"),
    ActionID="102869793",
)

paymentInLieuOfDividend = es.TransactionCash(
    ClientAccountID="FakeAccount",
    Currency="USD",
    FXRateToBase=1.2,
    AssetClass=es.AssetClass.CASH,
    SubCategory=es.SubCategory.COMMON,
    Symbol="TTE",
    Description="TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE (Payment in Lieu of Dividends)",
    Conid="29612193",
    SecurityID="FR0000120271",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP=None,
    ISIN="FR0000120271",
    FIGI=None,
    ListingExchange="SBF",
    DateTime=ar.get("2023-01-01T02:00:00"),
    SettleDate=ar.get("2023-01-01"),
    Amount=2.64,
    Type=es.CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS,
    Code=None,
    TransactionID="269176073",
    ReportDate=ar.get("2023-01-01"),
    ActionID="102869793",
)

witholdingTaxForPaymentInLieuOfDividend = es.TransactionCash(
    ClientAccountID="FakeAccount",
    Currency="USD",
    FXRateToBase=1.2,
    AssetClass=es.AssetClass.CASH,
    SubCategory=es.SubCategory.COMMON,
    Symbol="TTE",
    Description="TTE(FR0000120271) PAYMENT IN LIEU OF DIVIDEND - FR TAX",
    Conid="29612193",
    SecurityID="FR0000120271",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP=None,
    ISIN="FR0000120271",
    FIGI=None,
    ListingExchange="SBF",
    DateTime=ar.get("2023-01-01T02:00:00"),
    SettleDate=ar.get("2023-01-01"),
    Amount=-0.66,
    Type=es.CashTransactionType.WITHOLDING_TAX,
    Code=None,
    TransactionID="323614082",
    ReportDate=ar.get("2023-01-01"),
    ActionID="102869793",
)


class TestIbkrTransformCashTransaction:
    def testSingleDividend(self):
        segmented = st.SegmentedTrades(
            cashTransactions=[dividend],
            corporateActions=[],
            stockTrades=[],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1, "Given a single cash transaction, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.FinancialIdentifier.getIsin() == "FR0000120271", "Underlying group ISIN should match the cash transaction ISIN"
        assert (
            extracted.CashTransactions[0].FinancialIdentifier.getIsin() == "FR0000120271"
        ), "The cash transaction ISIN should match the ISIN of the group"
        assert isinstance(extracted.CashTransactions[0], StagingTradeEventCashTransactionDividend), "Dividend is of a dividend line type"
        assert (
            extracted.CashTransactions[0].ExchangedMoney.UnderlyingTradePrice == dividend.Amount * dividend.FXRateToBase
        ), "The Dividend Trade Price should match the dividend"
        assert extracted.CashTransactions[0].ExchangedMoney.UnderlyingQuantity == 1, "There was only one instance of the dividend paid"

    def testSinglePaymentInLieuOfDividend(self):
        segmented = st.SegmentedTrades(
            cashTransactions=[paymentInLieuOfDividend],
            corporateActions=[],
            stockTrades=[],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1, "Given a single cash transaction, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.FinancialIdentifier.getIsin() == "FR0000120271", "Underlying group ISIN should match the cash transaction ISIN"
        assert (
            extracted.CashTransactions[0].FinancialIdentifier.getIsin() == "FR0000120271"
        ), "The cash transaction ISIN should match the ISIN of the group"
        assert isinstance(
            extracted.CashTransactions[0], StagingTradeEventCashTransactionPaymentInLieuOfDividends
        ), "Payment in lieu of dividend is of a payment in lieu of dividend line type"
        assert (
            extracted.CashTransactions[0].ExchangedMoney.UnderlyingTradePrice
            == paymentInLieuOfDividend.Amount * paymentInLieuOfDividend.FXRateToBase
        ), "The Dividend Trade Price should match the dividend"
        assert (
            extracted.CashTransactions[0].ExchangedMoney.UnderlyingQuantity == 1
        ), "There was only one instance of the payment in lieu of dividend paid"

    def testSingleWitholdingTax(self):
        segmented = st.SegmentedTrades(
            cashTransactions=[witholdingTaxForDividend],
            corporateActions=[],
            stockTrades=[],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1, "Given a single cash transaction, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.FinancialIdentifier.getIsin() == "FR0000120271", "Underlying group ISIN should match the cash transaction ISIN"
        assert (
            extracted.CashTransactions[0].FinancialIdentifier.getIsin() == "FR0000120271"
        ), "The cash transaction ISIN should match the ISIN of the group"
        assert isinstance(
            extracted.CashTransactions[0], StagingTradeEventCashTransactionWitholdingTax
        ), "WitholdingTax is of a witholdingTax line type"
        assert (
            extracted.CashTransactions[0].ExchangedMoney.UnderlyingTradePrice
            == witholdingTaxForDividend.Amount * witholdingTaxForDividend.FXRateToBase
        ), "The Dividend Trade Price should match the dividend"
        assert extracted.CashTransactions[0].ExchangedMoney.UnderlyingQuantity == 1, "There was only one instance of the witholding tax"

    def testSingleWitholdingTaxForPaymentInLieuOfDividend(self):
        segmented = st.SegmentedTrades(
            cashTransactions=[witholdingTaxForPaymentInLieuOfDividend],
            corporateActions=[],
            stockTrades=[],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )

        extract = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)

        assert len(extract) == 1, "Given a single cash transaction, there should only be a single underlying group"

        extracted = extract[0]

        assert extracted.FinancialIdentifier.getIsin() == "FR0000120271", "Underlying group ISIN should match the cash transaction ISIN"
        assert (
            extracted.CashTransactions[0].FinancialIdentifier.getIsin() == "FR0000120271"
        ), "The cash transaction ISIN should match the ISIN of the group"
        assert isinstance(
            extracted.CashTransactions[0], StagingTradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividends
        ), "WitholdingTaxForPaymentInLieuOfDividend is of a witholdingTaxForPaymentInLieuOfDividend line type"
        assert (
            extracted.CashTransactions[0].ExchangedMoney.UnderlyingTradePrice
            == witholdingTaxForPaymentInLieuOfDividend.Amount * witholdingTaxForPaymentInLieuOfDividend.FXRateToBase
        ), "The Dividend Trade Price should match the dividend"
        assert extracted.CashTransactions[0].ExchangedMoney.UnderlyingQuantity == 1, "There was only one instance of the witholding tax"
