from opyoid.bindings.module import Module

from src.BrokerageExportProviders.Brokerages.IBKR.IbkrModule import IbkrModule


class BrokerageExportProvidersModule(Module):
    def configure(self) -> None:
        self.install(IbkrModule)
