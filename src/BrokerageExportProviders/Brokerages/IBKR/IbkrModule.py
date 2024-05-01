from opyoid.bindings.module import Module

from BrokerageExportProviders.Brokerages.IBKR.IbkrBrokerageExportProvider import (
    IbkrBrokerageExportProvider,
)


class IbkrModule(Module):
    def configure(self) -> None:
        self.bind(IbkrBrokerageExportProvider)
