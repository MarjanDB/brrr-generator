import os
from glob import glob

from lxml import etree

import src.BrokerageExportProviders.Brokerages.IBKR.Schemas.SegmentedTrades as st
import src.BrokerageExportProviders.Brokerages.IBKR.Transforms.Extract as e
import src.BrokerageExportProviders.Common.CommonBrokerageExportProvider as cbep


class IbkrBrokerageExportProvider(cbep.CommonBrokerageExportProvider[st.SegmentedTrades]):

    def getListOfReportsAvailableForBroker(self, pathToFolderContainingExports: str) -> list[str]:
        brokerExports = glob("*.xml", root_dir=pathToFolderContainingExports)
        fileLocation = list(map(lambda path: os.path.join(pathToFolderContainingExports, path), brokerExports))

        return fileLocation

    def getBrokerEventsForReport(self, brokerExportFileLocation: str) -> st.SegmentedTrades:
        with open(brokerExportFileLocation) as fobj:
            xml = fobj.read()

        root = etree.fromstring(xml)
        transactions = e.extractFromXML(root)

        return transactions
