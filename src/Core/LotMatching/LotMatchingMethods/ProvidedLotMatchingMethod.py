from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod


class ProvidedLotMatchingMethod(LotMatchingMethod):

    def performMatching(self): ...
