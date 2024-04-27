from abc import ABC, abstractmethod


class LotMatchingMethod(ABC):

    @abstractmethod
    def performMatching(self): ...
