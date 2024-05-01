import os
from glob import glob
from typing import Sequence

from lxml import etree

import src.BrokerageExportProviders.Brokerages.IBKR.Schemas.SegmentedTrades as st
import src.BrokerageExportProviders.Brokerages.IBKR.Transforms.Extract as e
import src.BrokerageExportProviders.Brokerages.IBKR.Transforms.Transform as t
import src.BrokerageExportProviders.Common.CommonBrokerageExportProvider as cbep
from src.StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping


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

    def mergeBrokerEvents(self, events: Sequence[st.SegmentedTrades]) -> st.SegmentedTrades:
        return e.mergeTrades(list(events))

    def transformBrokerEventsToBrokerAgnosticEvents(self, events: st.SegmentedTrades) -> Sequence[StagingFinancialGrouping]:
        return t.convertSegmentedTradesToGenericUnderlyingGroups(events)
