from opyoid.bindings.module import Module

from src.ConfigurationProvider.Configuration import ConfigurationProvider


class ConfigurationModule(Module):
    def configure(self) -> None: ...

    # self.bind(ConfigurationProvider) # TODO: Fix ConfigurationProvider to work with injections
