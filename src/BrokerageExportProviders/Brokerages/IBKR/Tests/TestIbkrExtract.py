import os
import pathlib

from lxml import etree

import BrokerageExportProviders.Brokerages.IBKR.Schemas.Schemas as es
import BrokerageExportProviders.Brokerages.IBKR.Schemas.SegmentedTrades as st
import BrokerageExportProviders.Brokerages.IBKR.Transforms.Extract as ex

locationOfFiles = pathlib.Path(__file__).parent
simpleStockTradeXml = os.path.join(locationOfFiles, "SimpleStockTrade.xml")
simpleOptionTradeXml = os.path.join(locationOfFiles, "SimpleOptionTrade.xml")
simpleCorporateActionXml = os.path.join(locationOfFiles, "SimpleCorporateAction.xml")
simpleCashTransactionsXml = os.path.join(locationOfFiles, "SimpleCashTransaction.xml")

with open(simpleStockTradeXml) as fobj:
    tradeString = fobj.read()
    simpleStockTrade: etree._Element = etree.fromstring(tradeString)

with open(simpleOptionTradeXml) as fobj:
    tradeString = fobj.read()
    simpleOptionTrade: etree._Element = etree.fromstring(tradeString)

with open(simpleCorporateActionXml) as fobj:
    tradeString = fobj.read()
    simpleCorporateAction: etree._Element = etree.fromstring(tradeString)

with open(simpleCashTransactionsXml) as fobj:
    tradeString = fobj.read()
    simpleCashTransactions: etree._Element = etree.fromstring(tradeString)


class TestIbkrExtractStockTrades:
    def testSegmentedTradesReturnTradesAndLot(self):
        segmented = ex.extractFromXML(simpleStockTrade)

        assert isinstance(segmented, st.SegmentedTrades)
        assert len(segmented.stockTrades) == 2
        assert len(segmented.stockLots) == 1

    def testSegmentedTradesContainBuyAndSellEvent(self):
        segmented = ex.extractFromXML(simpleStockTrade)

        buyTrade = segmented.stockTrades[0]
        assert buyTrade.BuyOrSell == es.BuyOrSell.BUY
        assert buyTrade.ISIN == "FR0010242511"
        assert buyTrade.Quantity == 5
        assert buyTrade.TransactionID == "241234985"

        sellTrade = segmented.stockTrades[1]
        assert sellTrade.BuyOrSell == es.BuyOrSell.SELL
        assert sellTrade.ISIN == "FR0010242511"
        assert sellTrade.Quantity == -5
        assert sellTrade.TransactionID == "262720557"

    def testBuyEventTransactionRelatesToLot(self):
        segmented = ex.extractFromXML(simpleStockTrade)

        buyTrade = segmented.stockTrades[0]
        assert buyTrade.TransactionID == "241234985"

        lot = segmented.stockLots[0]
        assert lot.TransactionID == "241234985"

    def testStockTradeMerging(self):
        segmented1 = ex.extractFromXML(simpleStockTrade)
        segmented2 = ex.extractFromXML(simpleStockTrade)

        merged = ex.mergeTrades([segmented1, segmented2])

        assert len(merged.stockTrades) == 2, "There should only be one trade when merging 2 SegmentedTrades containing the same trade"


class TestIbkrExtractOptionTrades:
    def testSegmentedTradesReturnTradesAndLot(self):
        segmented = ex.extractFromXML(simpleOptionTrade)

        assert isinstance(segmented, st.SegmentedTrades)
        assert len(segmented.derivativeTrades) == 2
        assert len(segmented.derivativeLots) == 1

    def testSegmentedTradesContainBuyAndSellEvent(self):
        segmented = ex.extractFromXML(simpleOptionTrade)

        buyTrade = segmented.derivativeTrades[0]
        assert buyTrade.BuyOrSell == es.BuyOrSell.BUY
        assert buyTrade.UnderlyingSecurityID == "US0378331005"
        assert buyTrade.Quantity == 1
        assert buyTrade.Multiplier == 100
        assert buyTrade.TransactionID == "635331370"

        sellTrade = segmented.derivativeTrades[1]
        assert sellTrade.BuyOrSell == es.BuyOrSell.SELL
        assert sellTrade.UnderlyingSecurityID == "US0378331005"
        assert sellTrade.Quantity == -1
        assert sellTrade.Multiplier == 100
        assert sellTrade.TransactionID == "639309966"

    def testBuyEventTransactionRelatesToLot(self):
        segmented = ex.extractFromXML(simpleOptionTrade)

        buyTrade = segmented.derivativeTrades[0]
        assert buyTrade.TransactionID == "635331370"

        lot = segmented.derivativeLots[0]
        assert lot.TransactionID == "635331370"

    def testStockTradeMerging(self):
        segmented1 = ex.extractFromXML(simpleOptionTrade)
        segmented2 = ex.extractFromXML(simpleOptionTrade)

        merged = ex.mergeTrades([segmented1, segmented2])

        assert len(merged.derivativeTrades) == 2, "There should only be one trade when merging 2 SegmentedTrades containing the same trade"


class TestIbkrExtractCorporateActions:
    def testSegmentedTradesReturnCorporateAction(self):
        segmented = ex.extractFromXML(simpleCorporateAction)

        assert isinstance(segmented, st.SegmentedTrades)
        assert len(segmented.derivativeTrades) == 0
        assert len(segmented.derivativeLots) == 0
        assert len(segmented.corporateActions) == 1

    def testCorporateActionMerging(self):
        segmented1 = ex.extractFromXML(simpleCorporateAction)
        segmented2 = ex.extractFromXML(simpleCorporateAction)

        merged = ex.mergeTrades([segmented1, segmented2])

        assert (
            len(merged.corporateActions) == 1
        ), "There should only be one Corporate Action when merging 2 SegmentedTrades containing the same Corporate Action"


class TestIbkrExtractCashTransactions:
    def testSegmentedTradesReturnCashTransactions(self):
        segmented = ex.extractFromXML(simpleCashTransactions)

        assert isinstance(segmented, st.SegmentedTrades)
        assert len(segmented.derivativeTrades) == 0
        assert len(segmented.derivativeLots) == 0
        assert len(segmented.corporateActions) == 0
        assert len(segmented.cashTransactions) == 2

    def testCashTransactionMerging(self):
        segmented1 = ex.extractFromXML(simpleCashTransactions)
        segmented2 = ex.extractFromXML(simpleCashTransactions)

        merged = ex.mergeTrades([segmented1, segmented2])

        assert (
            len(merged.cashTransactions) == 2
        ), "There should only be two Cash Transactions when merging 2 SegmentedTrades which both contain 2 of the same Cash Transactions"

    def testSegmentedTradesContainsTwoCashTransactions(self):
        segmented = ex.extractFromXML(simpleCashTransactions)

        dividend = segmented.cashTransactions[0]
        assert dividend.TransactionID == "269176073"
        assert dividend.ISIN == "FR0000120271"
        assert dividend.Type == es.CashTransactionType.DIVIDEND.value

        witholdingTax = segmented.cashTransactions[1]
        assert witholdingTax.TransactionID == "323614082"
        assert witholdingTax.ISIN == "FR0000120271"
        assert witholdingTax.Type == es.CashTransactionType.WITHOLDING_TAX.value
