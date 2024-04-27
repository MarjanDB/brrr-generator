from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod


class FifoLotMatchingMethod(LotMatchingMethod):

    def performMatching(self): ...
