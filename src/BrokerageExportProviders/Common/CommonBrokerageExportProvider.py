from abc import ABC, abstractmethod
from typing import Any, Generic, Sequence, TypeVar

from src.BrokerageExportProviders.Contracts.CommonBrokerageEvents import (
    CommonBrokerageEvents,
)

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
