from dataclasses import dataclass
from itertools import groupby
from typing import Generic, Sequence, TypeVar

import src.BrokerageExportProviders.Brokerages.IBKR.Schemas.Schemas as s
import src.BrokerageExportProviders.Brokerages.IBKR.Schemas.SegmentedTrades as st
import src.TaxAuthorityProvider.Schemas.GenericFormats as gf

LINE_GENERIC_BUY = TypeVar("LINE_GENERIC_BUY")
LINE_GENERIC_SELL = TypeVar("LINE_GENERIC_SELL")


@dataclass
class SegmentedBuyEvent(Generic[LINE_GENERIC_BUY]):
    Quantity: float
    BuyLine: LINE_GENERIC_BUY


@dataclass
class SegmentedSellEvent(Generic[LINE_GENERIC_SELL]):
    Quantity: float
    SellLine: LINE_GENERIC_SELL


@dataclass
class SegmentedTradeEvents(Generic[LINE_GENERIC_BUY, LINE_GENERIC_SELL]):
    Buys: list[SegmentedBuyEvent[LINE_GENERIC_BUY]]
    Sells: list[SegmentedSellEvent[LINE_GENERIC_SELL]]


@dataclass
class SegmentedTrades(Generic[LINE_GENERIC_BUY, LINE_GENERIC_SELL]):
    Buys: list[LINE_GENERIC_BUY]
    Sells: list[LINE_GENERIC_SELL]


def getGenericDividendLineFromIBRKCashTransactions(
    cashTransactions: list[s.TransactionCash],
) -> list[gf.GenericDividendLine]:
    def mapToGenericDividendLine(
        transaction: s.TransactionCash,
    ) -> gf.GenericDividendLine:
        edavkiDividendType = gf.GenericDividendType.UNKNOWN

        ordinaryDividend = transaction.Description.__contains__("Ordinary Dividend")
        bonusDividend = transaction.Description.__contains__("Bonus Dividend")

        if ordinaryDividend:
            edavkiDividendType = gf.GenericDividendType.ORDINARY

        if bonusDividend:
            edavkiDividendType = gf.GenericDividendType.BONUS

        dividendMapping = {
            s.CashTransactionType.DIVIDEND: gf.GenericDividendLineType.DIVIDEND,
            s.CashTransactionType.WITHOLDING_TAX: gf.GenericDividendLineType.WITHOLDING_TAX,
        }

        return gf.GenericDividendLine(
            AccountID=transaction.ClientAccountID,
            LineCurrency=transaction.Currency,
            ConversionToBaseAccountCurrency=transaction.FXRateToBase,
            AccountCurrency=transaction.Currency,
            ReceivedDateTime=transaction.DateTime,
            AmountInCurrency=transaction.Amount,
            DividendActionID=transaction.ActionID,
            SecurityISIN=transaction.ISIN,
            ListingExchange=transaction.ListingExchange,
            DividendType=edavkiDividendType,
            LineType=dividendMapping[transaction.Type],
        )

    return list(map(mapToGenericDividendLine, cashTransactions))


def convertStockTradesToStockTradeEvents(
    trades: Sequence[s.TradeStock],
) -> Sequence[gf.TradeEventStagingStockAcquired | gf.TradeEventStagingStockSold]:

    def convertAcquiredTradeToAcquiredEvent(
        trade: s.TradeStock,
    ) -> gf.TradeEventStagingStockAcquired:
        converted = gf.TradeEventStagingStockAcquired(
            ID=trade.TransactionID,
            ISIN=trade.ISIN,
            Ticker=trade.Symbol,
            AssetClass=gf.GenericAssetClass.STOCK,
            Date=trade.DateTime,
            AcquiredReason=gf.GenericTradeReportItemGainType.BOUGHT,  # TODO: Determine reason for acquire
            Multiplier=1,
            ExchangedMoney=gf.GenericMonetaryExchangeInformation(
                UnderlyingCurrency=trade.Currency,
                UnderlyingQuantity=trade.Quantity,
                UnderlyingTradePrice=trade.TradePrice * trade.FXRateToBase,  # TODO: Remove in favor of currency conversion provider
                ComissionCurrency=trade.IBCommissionCurrency,
                ComissionTotal=trade.IBCommission,
                TaxCurrency=trade.Currency,  # NOTE: Taxes Currency == Trade Currency ??
                TaxTotal=trade.Taxes,
            ),
        )
        return converted

    def convertSoldTradeToSoldEvent(
        trade: s.TradeStock,
    ) -> gf.TradeEventStagingStockSold:
        converted = gf.TradeEventStagingStockSold(
            ID=trade.TransactionID,
            ISIN=trade.ISIN,
            Ticker=trade.Symbol,
            AssetClass=gf.GenericAssetClass.STOCK,
            Date=trade.DateTime,
            Multiplier=1,
            ExchangedMoney=gf.GenericMonetaryExchangeInformation(
                UnderlyingCurrency=trade.Currency,
                UnderlyingQuantity=trade.Quantity,
                UnderlyingTradePrice=trade.TradePrice * trade.FXRateToBase,  # TODO: Remove in favor of currency conversion provider
                ComissionCurrency=trade.IBCommissionCurrency,
                ComissionTotal=trade.IBCommission,
                TaxCurrency=trade.Currency,  # NOTE: Taxes Currency == Trade Currency ??
                TaxTotal=trade.Taxes,
            ),
        )
        return converted

    def convertTradeToTradeEvent(
        trade: s.TradeStock,
    ) -> gf.TradeEventStagingStockSold | gf.TradeEventStagingStockAcquired:
        buyEvent = trade.Quantity > 0
        if buyEvent:
            return convertAcquiredTradeToAcquiredEvent(trade)
        else:
            return convertSoldTradeToSoldEvent(trade)

    tradeEvents = list(map(convertTradeToTradeEvent, trades))
    return tradeEvents


def convertStockLotsToStockLotEvents(
    lots: Sequence[s.LotStock],
) -> Sequence[gf.GenericTaxLotEventStaging]:
    def convertSingleLot(lot: s.LotStock) -> gf.GenericTaxLotEventStaging:
        converted = gf.GenericTaxLotEventStaging(
            lot.TransactionID,
            ISIN=lot.ISIN,
            Ticker=lot.Symbol,
            Quantity=lot.Quantity,
            Acquired=gf.GenericTaxLotMatchingDetails(ID=lot.TransactionID, DateTime=None),
            Sold=gf.GenericTaxLotMatchingDetails(ID=None, DateTime=lot.DateTime),
            ShortLongType=gf.GenericShortLong.LONG,  # TODO: Determine long / short if possible
        )
        return converted

    lotEvents = list(map(convertSingleLot, lots))
    return lotEvents


def convertDerivativeTradesToDerivativeTradeEvents(
    trades: Sequence[s.TradeDerivative],
) -> Sequence[gf.TradeEventStagingDerivativeAcquired | gf.TradeEventStagingDerivativeSold]:

    def convertAcquiredTradeToAcquiredEvent(
        trade: s.TradeDerivative,
    ) -> gf.TradeEventStagingDerivativeAcquired:
        converted = gf.TradeEventStagingDerivativeAcquired(
            ID=trade.TransactionID,
            ISIN=trade.UnderlyingSecurityID,
            Ticker=trade.UnderlyingSymbol,
            AssetClass=gf.GenericAssetClass.OPTION,  # TODO: Could also be stock but leveraged (multiplier)
            Multiplier=trade.Multiplier,
            AcquiredReason=gf.GenericTradeReportItemGainType.BOUGHT,  # TODO: Determine reason for acquire
            Date=trade.DateTime,
            ExchangedMoney=gf.GenericMonetaryExchangeInformation(
                UnderlyingCurrency=trade.Currency,
                UnderlyingQuantity=trade.Quantity,
                UnderlyingTradePrice=trade.TradePrice * trade.FXRateToBase,  # TODO: Remove in favor of currency conversion provider
                ComissionCurrency=trade.IBCommissionCurrency,
                ComissionTotal=trade.IBCommission,
                TaxCurrency=trade.Currency,  # NOTE: Taxes Currency == Trade Currency ??
                TaxTotal=trade.Taxes,
            ),
        )
        return converted

    def convertSoldTradeToSoldEvent(
        trade: s.TradeDerivative,
    ) -> gf.TradeEventStagingDerivativeSold:
        converted = gf.TradeEventStagingDerivativeSold(
            ID=trade.TransactionID,
            ISIN=trade.UnderlyingSecurityID,
            Ticker=trade.UnderlyingSymbol,
            AssetClass=gf.GenericAssetClass.OPTION,
            Multiplier=trade.Multiplier,
            Date=trade.DateTime,
            ExchangedMoney=gf.GenericMonetaryExchangeInformation(
                UnderlyingCurrency=trade.Currency,
                UnderlyingQuantity=trade.Quantity,
                UnderlyingTradePrice=trade.TradePrice * trade.FXRateToBase,  # TODO: Remove in favor of currency conversion provider
                ComissionCurrency=trade.IBCommissionCurrency,
                ComissionTotal=trade.IBCommission,
                TaxCurrency=trade.Currency,  # NOTE: Taxes Currency == Trade Currency ??
                TaxTotal=trade.Taxes,
            ),
        )
        return converted

    def convertTradeToTradeEvent(
        trade: s.TradeDerivative,
    ) -> gf.TradeEventStagingDerivativeSold | gf.TradeEventStagingDerivativeAcquired:
        buyEvent = trade.Quantity > 0
        if buyEvent:
            return convertAcquiredTradeToAcquiredEvent(trade)
        else:
            return convertSoldTradeToSoldEvent(trade)

    tradeEvents = list(map(convertTradeToTradeEvent, trades))
    return tradeEvents


def convertDerivativeLotsToDerivativeLotEvents(
    lots: Sequence[s.LotDerivative],
) -> Sequence[gf.GenericTaxLotEventStaging]:
    def convertSingleLot(lot: s.LotDerivative) -> gf.GenericTaxLotEventStaging:
        converted = gf.GenericTaxLotEventStaging(
            lot.TransactionID,
            ISIN=lot.UnderlyingSecurityID,
            Ticker=lot.UnderlyingSymbol,
            Quantity=lot.Quantity,
            Acquired=gf.GenericTaxLotMatchingDetails(ID=lot.TransactionID, DateTime=None),
            Sold=gf.GenericTaxLotMatchingDetails(ID=None, DateTime=lot.DateTime),
            ShortLongType=gf.GenericShortLong.LONG,  # TODO: Determine long / short if possible
        )
        return converted

    lotEvents = list(map(convertSingleLot, lots))
    return lotEvents


def convertSegmentedTradesToGenericUnderlyingGroups(
    segmented: st.SegmentedTrades,
) -> Sequence[gf.GenericUnderlyingGroupingStaging]:
    stockTrades = segmented.stockTrades
    stockLots = segmented.stockLots

    derivativeTrades = segmented.derivativeTrades
    derivativeLots = segmented.derivativeLots

    stockTrades.sort(key=lambda entry: entry.ISIN)
    stockLots.sort(key=lambda entry: entry.ISIN)
    derivativeTrades.sort(key=lambda entry: entry.UnderlyingSecurityID)
    derivativeLots.sort(key=lambda entry: entry.UnderlyingSecurityID)

    stockTradeEvents = convertStockTradesToStockTradeEvents(stockTrades)
    stockLotEvents = convertStockLotsToStockLotEvents(stockLots)

    derivativeTradeEvents = convertDerivativeTradesToDerivativeTradeEvents(derivativeTrades)
    derivativeLotEvents = convertDerivativeLotsToDerivativeLotEvents(derivativeLots)

    def segmentTradeByIsin(
        trades: list[gf.GenericTradeEventStaging],
    ) -> dict[str, Sequence[gf.GenericTradeEventStaging]]:
        segmented: dict[str, Sequence[gf.GenericTradeEventStaging]] = {}
        for key, valuesiter in groupby(trades, key=lambda trade: trade.ISIN):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    def segmentLotByIsin(
        lots: list[gf.GenericTaxLotEventStaging],
    ) -> dict[str, Sequence[gf.GenericTaxLotEventStaging]]:
        segmented: dict[str, Sequence[gf.GenericTaxLotEventStaging]] = {}
        for key, valuesiter in groupby(lots, key=lambda trade: trade.ISIN):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    stocksSegmented = segmentTradeByIsin(stockTradeEvents)  # type: ignore
    stockLotsSegmented = segmentLotByIsin(stockLotEvents)  # type: ignore
    derivativesSegmented = segmentTradeByIsin(derivativeTradeEvents)  # type: ignore
    derivativeLotsSegmented = segmentLotByIsin(derivativeLotEvents)  # type: ignore

    allIsinsPresent = list(
        set(
            list(stocksSegmented.keys())
            + list(derivativesSegmented.keys())
            + list(stockLotsSegmented.keys())
            + list(derivativeLotsSegmented.keys())
        )
    )

    generatedUnderlyingGroups: Sequence[gf.GenericUnderlyingGroupingStaging] = list()
    for isin in allIsinsPresent:
        wrapper = gf.GenericUnderlyingGroupingStaging(
            ISIN=isin,
            CountryOfOrigin=None,
            UnderlyingCategory=gf.GenericCategory.REGULAR,
            StockTrades=stocksSegmented.get(isin, []),  # type: ignore
            StockTaxLots=stockLotsSegmented.get(isin, []),
            DerivativeTrades=derivativesSegmented.get(isin, []),  # type: ignore
            DerivativeTaxLots=derivativeLotsSegmented.get(isin, []),
            Dividends=[],
        )
        generatedUnderlyingGroups.append(wrapper)

    return generatedUnderlyingGroups
