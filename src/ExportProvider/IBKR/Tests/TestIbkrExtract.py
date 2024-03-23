from lxml import etree
import os
import pathlib
import src.ExportProvider.IBKR.Extract as ex
import src.ExportProvider.IBKR.Schemas as es

locationOfFiles = pathlib.Path(__file__).parent
singleStockTradeXml = os.path.join(locationOfFiles, "SingleStockTrade.xml")
singleOptionTradeXml = os.path.join(locationOfFiles, "SingleOptionTrade.xml")

with open(singleStockTradeXml) as fobj:
    singleTradeString = fobj.read()
    singleStockTrade: etree._Element = etree.fromstring(singleTradeString)

with open(singleOptionTradeXml) as fobj:
    singleTradeString = fobj.read()
    singleOptionTrade: etree._Element = etree.fromstring(singleTradeString)



class TestIbkrExtractStockTrades:
    def testSegmentedTradesReturnTradesAndLot(self):
        segmented = ex.extractFromXML(singleStockTrade)

        assert isinstance(segmented, es.SegmentedTrades)
        assert len(segmented.stockTrades) == 2
        assert len(segmented.stockLots) == 1

    def testSegmentedTradesContainBuyAndSellEvent(self):
        segmented = ex.extractFromXML(singleStockTrade)

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
        segmented = ex.extractFromXML(singleStockTrade)

        buyTrade = segmented.stockTrades[0]
        assert buyTrade.TransactionID == "241234985"

        lot = segmented.stockLots[0]
        assert lot.TransactionID == "241234985"

class TestIbkrExtractOptionTrades:
    def testSegmentedTradesReturnTradesAndLot(self):
        segmented = ex.extractFromXML(singleOptionTrade)

        assert isinstance(segmented, es.SegmentedTrades)
        assert len(segmented.derivativeTrades) == 2
        assert len(segmented.derivativeLots) == 1

    def testSegmentedTradesContainBuyAndSellEvent(self):
        segmented = ex.extractFromXML(singleOptionTrade)

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
        segmented = ex.extractFromXML(singleOptionTrade)

        buyTrade = segmented.derivativeTrades[0]
        assert buyTrade.TransactionID == "635331370"

        lot = segmented.derivativeLots[0]
        assert lot.TransactionID == "635331370"



