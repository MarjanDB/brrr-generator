from opyoid.bindings.module import Module

from Core.LotMatching.Services.LotMatcher import LotMatcher


class LotMatchingModule(Module):
    def configure(self) -> None:
        self.bind(LotMatcher)
