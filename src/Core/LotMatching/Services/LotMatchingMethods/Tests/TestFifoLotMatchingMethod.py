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

simpleCaseWithMultipleSellEvents = {
    "Buy": Trade.Trade(
        ID="ID",
        Quantity=2,
        Date=get("2023-01-01"),
    ),
    "Sell": Trade.Trade(
        ID="ID2",
        Quantity=-1,
        Date=get("2023-01-02"),
    ),
    "Sell2": Trade.Trade(
        ID="ID3",
        Quantity=-1,
        Date=get("2023-01-03"),
    ),
}

simpleCaseWithMultipleBuyEvents = {
    "Buy": Trade.Trade(
        ID="ID",
        Quantity=1,
        Date=get("2023-01-01"),
    ),
    "Buy2": Trade.Trade(
        ID="ID2",
        Quantity=1,
        Date=get("2023-01-02"),
    ),
    "Sell": Trade.Trade(
        ID="ID3",
        Quantity=-2,
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

    def testMultipleBuyEvents(self):
        method = FifoLotMatchingMethod()

        events = [simpleCaseWithMultipleBuyEvents["Buy"], simpleCaseWithMultipleBuyEvents["Buy2"], simpleCaseWithMultipleBuyEvents["Sell"]]
        lots = method.performMatching(events)

        assert len(lots) == 2, "Given multiple buy events, a lot should be generated for each buy event"

        assert (
            lots[0].Quantity == simpleCaseWithMultipleBuyEvents["Buy"].Quantity
        ), "Generated Lot Quantity should match the first buy event's"
        assert (
            lots[0].Acquired.Relation.ID == simpleCaseWithMultipleBuyEvents["Buy"].ID
        ), "Generated lot's acquisition should point to the first buy event"
        assert lots[0].Sold.Relation.ID == simpleCaseWithMultipleBuyEvents["Sell"].ID, "Generated lot's sale should point to the sell event"

        assert (
            lots[1].Quantity == simpleCaseWithMultipleBuyEvents["Buy2"].Quantity
        ), "Generated Lot Quantity should match the second buy event's"
        assert (
            lots[1].Acquired.Relation.ID == simpleCaseWithMultipleBuyEvents["Buy2"].ID
        ), "Generated lot's acquisition should point to the second buy event"
        assert lots[1].Sold.Relation.ID == simpleCaseWithMultipleBuyEvents["Sell"].ID, "Generated lot's sale should point to the sell event"

    def testMultipleSellEvents(self):
        method = FifoLotMatchingMethod()

        events = [
            simpleCaseWithMultipleSellEvents["Buy"],
            simpleCaseWithMultipleSellEvents["Sell"],
            simpleCaseWithMultipleSellEvents["Sell2"],
        ]
        lots = method.performMatching(events)

        assert len(lots) == 2, "Given multiple sell events, a lot should be generated for each sell event"

        assert lots[0].Quantity == abs(
            simpleCaseWithMultipleSellEvents["Sell"].Quantity
        ), "Generated Lot Quantity should match the first sell event's"
        assert (
            lots[0].Acquired.Relation.ID == simpleCaseWithMultipleSellEvents["Buy"].ID
        ), "Generated lot's acquisition should point to the first buy event"
        assert (
            lots[0].Sold.Relation.ID == simpleCaseWithMultipleSellEvents["Sell"].ID
        ), "Generated lot's sale should point to the sell event"

        assert lots[1].Quantity == abs(
            simpleCaseWithMultipleSellEvents["Sell2"].Quantity
        ), "Generated Lot Quantity should match the second sell event's"
        assert (
            lots[1].Acquired.Relation.ID == simpleCaseWithMultipleSellEvents["Buy"].ID
        ), "Generated lot's acquisition should point to the first buy event"
        assert (
            lots[1].Sold.Relation.ID == simpleCaseWithMultipleSellEvents["Sell2"].ID
        ), "Generated lot's sale should point to the second sell event"
