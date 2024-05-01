from abc import ABC, abstractmethod
from typing import Any, Generic, Sequence, TypeVar

from BrokerageExportProviders.Contracts.CommonBrokerageEvents import (
    CommonBrokerageEvents,
)
from Core.StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping

BROKERAGE_EVENTS_TYPE = TypeVar("BROKERAGE_EVENTS_TYPE", bound=CommonBrokerageEvents[Any, Any, Any, Any, Any, Any])


class CommonBrokerageExportProvider(ABC, Generic[BROKERAGE_EVENTS_TYPE]):

    @abstractmethod
    def getListOfReportsAvailableForBroker(self, pathToFolderContainingExports: str) -> Sequence[str]:
        """
        The argument pathToFolderContainingExports will be the path to the folder which contains all exports (including possible exports from other brokers)
        The return should be a list of paths to files that are valid reports for this broker.
        """

    @abstractmethod
    def getBrokerEventsForReport(self, brokerExportFileLocation: str) -> BROKERAGE_EVENTS_TYPE:
        """
        The argument brokerExportFileLocation will be the path to a single exported report for this broker.
        The return should be an instance of all the broker events contained inside this export.
        """

    @abstractmethod
    def mergeBrokerEvents(self, events: Sequence[BROKERAGE_EVENTS_TYPE]) -> BROKERAGE_EVENTS_TYPE:
        """
        The argument events will be multiple a sequence of Broker Events that require merging.
        The return will be a Broker Events, which contain no duplicate Broker Events.
        """

    # TODO: These shouldn't already be grouped by ISIN, but instead only segmented. Grouping is common to all brokerages.
    @abstractmethod
    def transformBrokerEventsToBrokerAgnosticEvents(self, events: BROKERAGE_EVENTS_TYPE) -> Sequence[StagingFinancialGrouping]:
        """
        The argument events will contain the Events specific to this Brokerage Provider.
        The return will be Broker Events which are agnostic to any one Brokerage.
        """
