from lxml import etree
import os
import pathlib
import src.ExportProvider.IBKR.Extract as ex
import src.ExportProvider.IBKR.Schemas as es

locationOfFiles = pathlib.Path(__file__).parent
singleTradeXml = os.path.join(locationOfFiles, "SingleTrade.xml")

with open(singleTradeXml) as fobj:
    singleTradeString = fobj.read()
    singleTrade: etree.ElementBase = etree.fromstring(singleTradeString)



class TestIbkr:
    def test_SegmentedTradesReturnTradesAndLot(self):
        segmented = ex.extractFromXML(singleTrade)

        assert isinstance(segmented, es.SegmentedTrades)
        assert len(segmented.stockTrades) == 2
        assert len(segmented.stockLots) == 1

    def test_SegmentedTradesContainBuyAndSellEvent(self):
        segmented = ex.extractFromXML(singleTrade)

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

    def test_BuyEventTransactionRelatesToLot(self):
        segmented = ex.extractFromXML(singleTrade)

        buyTrade = segmented.stockTrades[0]
        assert buyTrade.TransactionID == "241234985"

        lot = segmented.stockLots[0]
        assert lot.TransactionID == "241234985"



