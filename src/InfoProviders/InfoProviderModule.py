from opyoid.bindings.module import Module

from src.InfoProviders.InfoLookupProvider import (
    CompanyLookupProvider,
    CountryLookupProvider,
)


class InfoProviderModule(Module):
    def configure(self) -> None:
        self.bind(CountryLookupProvider)
        self.bind(CompanyLookupProvider)
