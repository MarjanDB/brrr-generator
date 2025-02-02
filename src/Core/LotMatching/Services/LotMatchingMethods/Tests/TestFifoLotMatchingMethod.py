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

simpleCaseWithBuySellBuySellEvents = {
    "Buy1": Trade.Trade(
        ID="ID",
        Quantity=1,
        Date=get("2023-01-01"),
    ),
    "Sell1": Trade.Trade(
        ID="ID2",
        Quantity=-1,
        Date=get("2023-01-02"),
    ),
    "Buy2": Trade.Trade(
        ID="ID3",
        Quantity=1,
        Date=get("2023-01-03"),
    ),
    "Sell2": Trade.Trade(
        ID="ID4",
        Quantity=-1,
        Date=get("2023-01-04"),
    ),
}

complexCaseOverlappingEvents = {
    "Buy1": Trade.Trade(
        ID="ID1",
        Quantity=2,
        Date=get("2023-01-01"),
    ),
    "Sell1": Trade.Trade(
        ID="ID2",
        Quantity=-1,
        Date=get("2023-01-02"),
    ),
    "Buy2": Trade.Trade(
        ID="ID3",
        Quantity=1,
        Date=get("2023-01-03"),
    ),
    "Sell2": Trade.Trade(
        ID="ID4",
        Quantity=-2,
        Date=get("2023-01-04"),
    ),
}


complexCasePartialBuys = {
    "Buy1": Trade.Trade(
        ID="ID1",
        Quantity=0.5,
        Date=get("2023-01-01"),
    ),
    "Buy2": Trade.Trade(
        ID="ID2",
        Quantity=0.5,
        Date=get("2023-01-02"),
    ),
    "Sell": Trade.Trade(
        ID="ID3",
        Quantity=-1,
        Date=get("2023-01-03"),
    ),
}

complexCasePartialSells = {
    "Buy": Trade.Trade(
        ID="ID1",
        Quantity=1,
        Date=get("2023-01-01"),
    ),
    "Sell1": Trade.Trade(
        ID="ID2",
        Quantity=-0.5,
        Date=get("2023-01-02"),
    ),
    "Sell2": Trade.Trade(
        ID="ID3",
        Quantity=-0.5,
        Date=get("2023-01-03"),
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

    def testSimpleSingleLotGenerationWithMultipleBuySellEvents(self):
        method = FifoLotMatchingMethod()

        events = [
            simpleCaseWithBuySellBuySellEvents["Buy1"],
            simpleCaseWithBuySellBuySellEvents["Sell1"],
            simpleCaseWithBuySellBuySellEvents["Buy2"],
            simpleCaseWithBuySellBuySellEvents["Sell2"],
        ]
        lots = method.performMatching(events)

        assert len(lots) == 2, "Given a single predefined lot, only a single lot should be generated"

        assert lots[0].Quantity == 1, "Generated Lot Quantity should match the predefined lot's"
        assert (
            lots[0].Acquired.Relation == simpleCaseWithBuySellBuySellEvents["Buy1"]
        ), "Generated lot's acquisition should match the first buy event"
        assert (
            lots[0].Sold.Relation == simpleCaseWithBuySellBuySellEvents["Sell1"]
        ), "Generated lot's sale should match the first sell event"

        assert lots[1].Quantity == 1, "Generated Lot Quantity should match the predefined lot's"
        assert (
            lots[1].Acquired.Relation == simpleCaseWithBuySellBuySellEvents["Buy2"]
        ), "Generated lot's acquisition should match the second buy event"
        assert (
            lots[1].Sold.Relation == simpleCaseWithBuySellBuySellEvents["Sell2"]
        ), "Generated lot's sale should match the second sell event"

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

    def testComplexOverlappingEvents(self):
        method = FifoLotMatchingMethod()

        events = [
            complexCaseOverlappingEvents["Buy1"],
            complexCaseOverlappingEvents["Sell1"],
            complexCaseOverlappingEvents["Buy2"],
            complexCaseOverlappingEvents["Sell2"],
        ]
        lots = method.performMatching(events)

        assert len(lots) == 3, "Given multiple overlapping events, a lot should be generated for each overlapping event"

        assert lots[0].Quantity == 1
        assert lots[0].Acquired.Relation == complexCaseOverlappingEvents["Buy1"]
        assert lots[0].Sold.Relation == complexCaseOverlappingEvents["Sell1"]

        assert lots[1].Quantity == 1
        assert lots[1].Acquired.Relation == complexCaseOverlappingEvents["Buy1"]
        assert lots[1].Sold.Relation == complexCaseOverlappingEvents["Sell2"]

        assert lots[2].Quantity == 1
        assert lots[2].Acquired.Relation == complexCaseOverlappingEvents["Buy2"]
        assert lots[2].Sold.Relation == complexCaseOverlappingEvents["Sell2"]

    def testComplexPartialBuys(self):
        method = FifoLotMatchingMethod()

        events = [
            complexCasePartialBuys["Buy1"],
            complexCasePartialBuys["Buy2"],
            complexCasePartialBuys["Sell"],
        ]
        lots = method.performMatching(events)

        assert len(lots) == 2

        assert lots[0].Quantity == 0.5
        assert lots[0].Acquired.Relation == complexCasePartialBuys["Buy1"]
        assert lots[0].Sold.Relation == complexCasePartialBuys["Sell"]

        assert lots[1].Quantity == 0.5
        assert lots[1].Acquired.Relation == complexCasePartialBuys["Buy2"]
        assert lots[1].Sold.Relation == complexCasePartialBuys["Sell"]

    def testComplexPartialSells(self):
        method = FifoLotMatchingMethod()

        events = [
            complexCasePartialSells["Buy"],
            complexCasePartialSells["Sell1"],
            complexCasePartialSells["Sell2"],
        ]
        lots = method.performMatching(events)

        assert len(lots) == 2

        assert lots[0].Quantity == 0.5
        assert lots[0].Acquired.Relation == complexCasePartialSells["Buy"]
        assert lots[0].Sold.Relation == complexCasePartialSells["Sell1"]

        assert lots[1].Quantity == 0.5
        assert lots[1].Acquired.Relation == complexCasePartialSells["Buy"]
        assert lots[1].Sold.Relation == complexCasePartialSells["Sell2"]
