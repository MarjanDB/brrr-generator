from opyoid.bindings.module import Module
from opyoid.injector import Injector

from src.BrokerageExportProviders.BrokerageExportProvidersModule import (
    BrokerageExportProvidersModule,
)
from src.ConfigurationProvider.ConfigurationModule import ConfigurationModule
from src.Core.FinancialEvents.FinancialEventsModule import FinancialEventsModule
from src.Core.LotMatching.LotMatchingModule import LotMatchingModule
from src.InfoProviders.InfoProviderModule import InfoProviderModule


class AppModule(Module):
    def configure(self) -> None:
        self.install(FinancialEventsModule)
        self.install(InfoProviderModule)
        self.install(BrokerageExportProvidersModule)
        self.install(ConfigurationModule)
        self.install(LotMatchingModule)


appInjector = Injector([AppModule])
