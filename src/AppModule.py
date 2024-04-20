from opyoid.bindings.module import Module
from opyoid.injector import Injector

from src.Core.FinancialEvents.FinancialEventsModule import FinancialEventsModule
from src.InfoProviders.InfoProviderModule import InfoProviderModule


class AppModule(Module):
    def configure(self) -> None:
        self.install(FinancialEventsModule)
        self.install(InfoProviderModule)


injector = Injector([AppModule])
