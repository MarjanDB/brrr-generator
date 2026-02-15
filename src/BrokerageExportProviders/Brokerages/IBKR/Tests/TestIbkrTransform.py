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
from Core.StagingFinancialEvents.Schemas.IdentifierRelationship import (
    StagingIdentifierChangeType,
)
from Core.StagingFinancialEvents.Services.IdentifierRelationshipResolution import (
    IdentifierRelationshipResolution,
)

# Two corporate action rows (same ActionID) for transform tests: old ISIN -> new ISIN (SPLIT 10 FOR 1).
_corporateActionOld = es.CorporateAction(
    ClientAccountID="U1",
    AccountAlias=None,
    Model=None,
    Currency="USD",
    FXRateToBase=0.90354,
    AssetClass=es.AssetClass.STOCK,
    SubCategory=es.SubCategory.COMMON,
    Symbol="SMCI.OLD",
    Description="SMCI(US86800U1043) SPLIT 10 FOR 1 (SMCI.OLD, SUPER MICRO COMPUTER INC, US86800U1043)",
    Conid="43261373",
    SecurityID="US86800U1043",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP="86800U104",
    ISIN="US86800U1043",
    FIGI=None,
    ListingExchange="NASDAQ",
    UnderlyingConid=None,
    UnderlyingSymbol=None,
    UnderlyingSecurityID=None,
    UnderlyingListingExchange=None,
    Multiplier=1.0,
    Strike=None,
    Expiry=None,
    PutOrCall=None,
    PrincipalAdjustFactor=None,
    ReportDate=ar.get("2024-10-01"),
    DateTime=ar.get("2024-09-30 20:25:00"),
    ActionDescription="SMCI(US86800U1043) SPLIT 10 FOR 1 (SMCI.OLD, SUPER MICRO COMPUTER INC, US86800U1043)",
    Amount=0.0,
    Proceeds=0.0,
    Value=0.0,
    Quantity=-4.0,
    FifoProfitAndLossRealized=0.0,
    CapitalGainsProfitAndLoss=0.0,
    ForexProfitAndLoss=0.0,
    MarketToMarketProfitAndLoss=0.0,
    NotesAndCodes=[],
    Type="FI",
    TransactionID="3131760419",
    ActionID="141913764",
    LevelOfDetail=es.LevelOfDetail.DETAIL,
    SerialNumber=None,
    DeliveryType=None,
    CommodityType=None,
    Fineness=0.0,
    Weight=0.0,
)
_corporateActionNew = es.CorporateAction(
    ClientAccountID="U1",
    AccountAlias=None,
    Model=None,
    Currency="USD",
    FXRateToBase=0.90354,
    AssetClass=es.AssetClass.STOCK,
    SubCategory=es.SubCategory.COMMON,
    Symbol="SMCI",
    Description="SMCI(US86800U1043) SPLIT 10 FOR 1 (SMCI, SUPER MICRO COMPUTER INC, US86800U3023)",
    Conid="731466419",
    SecurityID="US86800U3023",
    SecurityIDType=es.SecurityIDType.ISIN,
    CUSIP="86800U302",
    ISIN="US86800U3023",
    FIGI=None,
    ListingExchange="NASDAQ",
    UnderlyingConid=None,
    UnderlyingSymbol=None,
    UnderlyingSecurityID=None,
    UnderlyingListingExchange=None,
    Multiplier=1.0,
    Strike=None,
    Expiry=None,
    PutOrCall=None,
    PrincipalAdjustFactor=None,
    ReportDate=ar.get("2024-10-01"),
    DateTime=ar.get("2024-09-30 20:25:00"),
    ActionDescription="SMCI(US86800U1043) SPLIT 10 FOR 1 (SMCI, SUPER MICRO COMPUTER INC, US86800U3023)",
    Amount=0.0,
    Proceeds=0.0,
    Value=0.0,
    Quantity=40.0,
    FifoProfitAndLossRealized=0.0,
    CapitalGainsProfitAndLoss=0.0,
    ForexProfitAndLoss=0.0,
    MarketToMarketProfitAndLoss=0.0,
    NotesAndCodes=[],
    Type="FI",
    TransactionID="3131760429",
    ActionID="141913764",
    LevelOfDetail=es.LevelOfDetail.DETAIL,
    SerialNumber=None,
    DeliveryType=None,
    CommodityType=None,
    Fineness=0.0,
    Weight=0.0,
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

        assert len(extract.Groupings) == 1, "Given a single trade, there should only be a single underlying group"

        extracted = extract.Groupings[0]

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

        assert len(extract.Groupings) == 1, "Given a single trade, there should only be a single underlying group"

        extracted = extract.Groupings[0]

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

        assert len(extract.Groupings) == 1, "Given a single trade, there should only be a single underlying group"

        extracted = extract.Groupings[0]

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

        assert len(extract.Groupings) == 1, "Given a single cash transaction, there should only be a single underlying group"

        extracted = extract.Groupings[0]

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

        assert len(extract.Groupings) == 1, "Given a single cash transaction, there should only be a single underlying group"

        extracted = extract.Groupings[0]

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

        assert len(extract.Groupings) == 1, "Given a single cash transaction, there should only be a single underlying group"

        extracted = extract.Groupings[0]

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

        assert len(extract.Groupings) == 1, "Given a single cash transaction, there should only be a single underlying group"

        extracted = extract.Groupings[0]

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


class TestIbkrTransformCorporateActions:
    def testCorporateActionsProducePartialRelationshipsOnly(self):
        """Transform emits one partial per row (no pairing); full relationships come from a later merge step."""
        segmented = st.SegmentedTrades(
            cashTransactions=[],
            corporateActions=[_corporateActionOld, _corporateActionNew],
            stockTrades=[],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )
        result = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)
        assert len(result.IdentifierRelationships.Relationships) == 0, "Transform should not produce full relationships"
        partials = result.IdentifierRelationships.PartialRelationships
        assert len(partials) == 2, "One partial per corporate action row"
        keys = {p.CorrelationKey for p in partials}
        assert keys == {"141913764"}, "Same ActionID so same CorrelationKey for later merge"
        from_partial = next(p for p in partials if p.FromIdentifier is not None and p.ToIdentifier is None)
        to_partial = next(p for p in partials if p.ToIdentifier is not None and p.FromIdentifier is None)
        assert from_partial.FromIdentifier.getIsin() == "US86800U1043"
        assert to_partial.ToIdentifier.getIsin() == "US86800U3023"
        assert from_partial.ChangeType == StagingIdentifierChangeType.SPLIT

    def testResolvePartialsProducesFullRelationship(self):
        """After broker-agnostic resolve, partials with same CorrelationKey become one full relationship."""
        segmented = st.SegmentedTrades(
            cashTransactions=[],
            corporateActions=[_corporateActionOld, _corporateActionNew],
            stockTrades=[],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )
        staging = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)
        resolved = IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(staging)
        rels = resolved.IdentifierRelationships.Relationships
        assert len(rels) == 1
        r = rels[0]
        assert r.FromIdentifier.getIsin() == "US86800U1043"
        assert r.ToIdentifier.getIsin() == "US86800U3023"
        assert r.ChangeType == StagingIdentifierChangeType.SPLIT
        assert r.EffectiveDate is not None

    def testNoCorporateActionsProduceNoPartials(self):
        segmented = st.SegmentedTrades(
            cashTransactions=[],
            corporateActions=[],
            stockTrades=[],
            stockLots=[],
            derivativeTrades=[],
            derivativeLots=[],
        )
        result = t.convertSegmentedTradesToGenericUnderlyingGroups(segmented)
        assert len(result.IdentifierRelationships.Relationships) == 0
        assert len(result.IdentifierRelationships.PartialRelationships) == 0
