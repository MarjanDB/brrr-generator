from arrow import get

from Core.FinancialEvents.Schemas.CommonFormats import (
    GenericAssetClass,
    GenericMonetaryExchangeInformation,
    GenericShortLong,
)
from Core.FinancialEvents.Schemas.Events import TradeEvent
from Core.FinancialEvents.Schemas.Lots import TaxLot
from Core.LotMatching.Services.LotMatchingMethods.ProvidedLotMatchingMethod import (
    ProvidedLotMatchingMethod,
)

simpleLot = TaxLot[TradeEvent, TradeEvent](
    ID="ID",
    ISIN="ISIN",
    Quantity=1,
    Acquired=TradeEvent(
        ID="ID",
        ISIN="ISIN",
        Ticker="TICKER",
        AssetClass=GenericAssetClass.STOCK,
        Date=get("2023-01-01"),
        Multiplier=1,
        ExchangedMoney=GenericMonetaryExchangeInformation(
            UnderlyingCurrency="EUR",
            UnderlyingQuantity=1,
            UnderlyingTradePrice=1,
            ComissionCurrency="EUR",
            ComissionTotal=0,
            TaxCurrency="EUR",
            TaxTotal=0,
        ),
    ),
    Sold=TradeEvent(
        ID="ID2",
        ISIN="ISIN",
        Ticker="TICKER",
        AssetClass=GenericAssetClass.STOCK,
        Date=get("2023-01-02"),
        Multiplier=1,
        ExchangedMoney=GenericMonetaryExchangeInformation(
            UnderlyingCurrency="EUR",
            UnderlyingQuantity=-1,
            UnderlyingTradePrice=1,
            ComissionCurrency="EUR",
            ComissionTotal=0,
            TaxCurrency="EUR",
            TaxTotal=0,
        ),
    ),
    ShortLongType=GenericShortLong.LONG,
)

underUtilizedLot = TaxLot[TradeEvent, TradeEvent](
    ID="ID",
    ISIN="ISIN",
    Quantity=1,
    Acquired=TradeEvent(
        ID="ID",
        ISIN="ISIN",
        Ticker="TICKER",
        AssetClass=GenericAssetClass.STOCK,
        Date=get("2023-01-01"),
        Multiplier=1,
        ExchangedMoney=GenericMonetaryExchangeInformation(
            UnderlyingCurrency="EUR",
            UnderlyingQuantity=2,
            UnderlyingTradePrice=1,
            ComissionCurrency="EUR",
            ComissionTotal=0,
            TaxCurrency="EUR",
            TaxTotal=0,
        ),
    ),
    Sold=TradeEvent(
        ID="ID2",
        ISIN="ISIN",
        Ticker="TICKER",
        AssetClass=GenericAssetClass.STOCK,
        Date=get("2023-01-02"),
        Multiplier=1,
        ExchangedMoney=GenericMonetaryExchangeInformation(
            UnderlyingCurrency="EUR",
            UnderlyingQuantity=-2,
            UnderlyingTradePrice=1,
            ComissionCurrency="EUR",
            ComissionTotal=0,
            TaxCurrency="EUR",
            TaxTotal=0,
        ),
    ),
    ShortLongType=GenericShortLong.LONG,
)


class TestProvidedLotMatchingMethod:

    def testSimpleSingleLotGeneration(self):
        method = ProvidedLotMatchingMethod(predefinedLots=[simpleLot])

        lots = method.performMatching([])

        assert len(lots) == 1, "Given a single predefined lot, only a single lot should be generated"

        assert lots[0].Quantity == 1, "Generated Lot Quantity should match the predefined lot's"
        assert (
            lots[0].Acquired.Relation.Date == simpleLot.Acquired.Date
        ), "Generated lot's acquisition date should match the predefined lot's"
        assert lots[0].Sold.Relation.Date == simpleLot.Sold.Date, "Generated lot's acquisition date should match the predefined lot's"

    def testSimpleSingleLotAndTradeGeneration(self):
        method = ProvidedLotMatchingMethod(predefinedLots=[simpleLot])

        lots = method.performMatching([])

        trades = method.generateTradesFromLotsWithTracking(lots)

        assert len(trades) == 2, "2 trades should be generated from a single lot, a buy trade and a sell trade"

        assert trades[0].ID == simpleLot.Acquired.ID, "Buy trade should come first, as trades are chronlogically sorted"
        assert trades[1].ID == simpleLot.Sold.ID, "Sell trade should come second, as trades are chronlogically sorted"

        assert trades[0].Quantity == simpleLot.Quantity, "Buy trade quantity should match the lot's, as it's the only usage of the trade"
        assert trades[1].Quantity == -simpleLot.Quantity, "Sell trade quantity should match the lot's, as it's the only usage of the trade"

    def testUnderUtilizedLotAndTradeGeneration(self):
        method = ProvidedLotMatchingMethod(predefinedLots=[underUtilizedLot])

        lots = method.performMatching([])
        assert len(lots) == 1, "1 lot should be generated from a 1 lot"

        trades = method.generateTradesFromLotsWithTracking(lots)

        assert len(trades) == 2, "2 trades should be generated from a single lot, a buy trade and a sell trade"

        assert trades[0].ID == underUtilizedLot.Acquired.ID, "Buy trade should come first, as trades are chronlogically sorted"
        assert trades[1].ID == underUtilizedLot.Sold.ID, "Sell trade should come second, as trades are chronlogically sorted"

        assert (
            trades[0].Quantity == underUtilizedLot.Quantity
        ), "Buy trade quantity should match the lot's, as it's the only usage of the trade"
        assert (
            trades[1].Quantity == -underUtilizedLot.Quantity
        ), "Sell trade quantity should match the lot's, as it's the only usage of the trade"

    def testFullyUtilizedTradesFromUnderUtilizedLotsAndTradeGeneration(self):
        method = ProvidedLotMatchingMethod(predefinedLots=[underUtilizedLot, underUtilizedLot])

        lots = method.performMatching([])
        assert len(lots) == 2, "2 lots should be generated from a 2 lots"

        trades = method.generateTradesFromLotsWithTracking(lots)

        assert len(trades) == 2, "2 trades should be generated from a single lot, a buy trade and a sell trade"

        assert trades[0].ID == underUtilizedLot.Acquired.ID, "Buy trade should come first, as trades are chronlogically sorted"
        assert trades[1].ID == underUtilizedLot.Sold.ID, "Sell trade should come second, as trades are chronlogically sorted"

        assert (
            trades[0].Quantity == underUtilizedLot.Acquired.ExchangedMoney.UnderlyingQuantity
        ), "Buy trade quantity should match the underlying trade's, as it's fully utlizied by 2 lots"
        assert (
            trades[1].Quantity == underUtilizedLot.Sold.ExchangedMoney.UnderlyingQuantity
        ), "Sell trade quantity should match the underlying trade's, as it's fully utlizied by 2 lots"
