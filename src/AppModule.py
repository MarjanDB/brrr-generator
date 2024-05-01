from opyoid.bindings.module import Module
from opyoid.injector import Injector

from BrokerageExportProviders.BrokerageExportProvidersModule import (
    BrokerageExportProvidersModule,
)
from ConfigurationProvider.ConfigurationModule import ConfigurationModule
from Core.FinancialEvents.FinancialEventsModule import FinancialEventsModule
from Core.LotMatching.LotMatchingModule import LotMatchingModule
from InfoProviders.InfoProviderModule import InfoProviderModule


class AppModule(Module):
    def configure(self) -> None:
        self.install(FinancialEventsModule)
        self.install(InfoProviderModule)
        self.install(BrokerageExportProvidersModule)
        self.install(ConfigurationModule)
        self.install(LotMatchingModule)


appInjector = Injector([AppModule])
