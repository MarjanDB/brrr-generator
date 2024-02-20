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
        


