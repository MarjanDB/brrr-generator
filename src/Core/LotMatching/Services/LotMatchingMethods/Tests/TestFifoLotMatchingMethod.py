from arrow import get

from Core.LotMatching.Schemas import Trade
from Core.LotMatching.Services.LotMatchingMethods.FifoLotMatchingMethod import (
    FifoLotMatchingMethod,
)

simpleCaseNoProfit = {
    "Buy": Trade.Trade(
        ID="ID",
        Quantity=1,
        Date=get("2023-01-01"),
    ),
    "Sell": Trade.Trade(
        ID="ID2",
        Quantity=-1,
        Date=get("2023-01-02"),
    ),
}


class TestFifoLotMatchingMethod:

    def testSimpleSingleLotGeneration(self):
        method = FifoLotMatchingMethod()

        events = [simpleCaseNoProfit["Buy"], simpleCaseNoProfit["Sell"]]
        lots = method.performMatching(events)

        assert len(lots) == 1, "Given a single predefined lot, only a single lot should be generated"

        assert lots[0].Quantity == 1, "Generated Lot Quantity should match the predefined lot's"
        assert (
            lots[0].Acquired.Relation.Date == simpleCaseNoProfit["Buy"].Date
        ), "Generated lot's acquisition date should match the predefined lot's"
        assert (
            lots[0].Sold.Relation.Date == simpleCaseNoProfit["Sell"].Date
        ), "Generated lot's acquisition date should match the predefined lot's"
