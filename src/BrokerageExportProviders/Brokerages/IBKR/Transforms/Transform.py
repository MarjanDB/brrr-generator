from dataclasses import dataclass
from itertools import groupby
from typing import Generic, Sequence, TypeVar

import src.BrokerageExportProviders.Brokerages.IBKR.Schemas.Schemas as s
import src.BrokerageExportProviders.Brokerages.IBKR.Schemas.SegmentedTrades as st
import src.Core.FinancialEvents.Schemas.CommonFormats as cf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf

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


def convertToCashTransactions(
    cashTransactions: list[s.TransactionCash],
) -> list[sgf.TransactionCashStaging]:
    def mapToGenericDividendLine(
        transaction: s.TransactionCash,
    ) -> sgf.TransactionCashStaging:
        dividendType = cf.GenericDividendType.UNKNOWN

        ordinaryDividend = transaction.Description.__contains__("Ordinary Dividend")
        bonusDividend = transaction.Description.__contains__("Bonus Dividend")

        if ordinaryDividend:
            dividendType = cf.GenericDividendType.ORDINARY

        if bonusDividend:
            dividendType = cf.GenericDividendType.BONUS

        if transaction.Type == s.CashTransactionType.DIVIDEND:
            return sgf.TransactionCashStagingDividend(
                AccountID=transaction.ClientAccountID,
                ReceivedDateTime=transaction.DateTime,
                ActionID=transaction.ActionID,
                TransactionID=transaction.TransactionID,
                ListingExchange=transaction.ListingExchange,
                DividendType=dividendType,
                SecurityISIN=transaction.ISIN,
                ExchangedMoney=cf.GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=1,
                    UnderlyingTradePrice=transaction.Amount * transaction.FXRateToBase,  # TODO: Currency provider
                    UnderlyingCurrency=transaction.Currency,
                    ComissionCurrency=transaction.Currency,
                    ComissionTotal=0,
                    TaxCurrency=transaction.Currency,
                    TaxTotal=0,
                ),
            )

        if transaction.Type == s.CashTransactionType.WITHOLDING_TAX:
            return sgf.TransactionCashStagingWitholdingTax(
                AccountID=transaction.ClientAccountID,
                ReceivedDateTime=transaction.DateTime,
                ActionID=transaction.ActionID,
                TransactionID=transaction.TransactionID,
                ListingExchange=transaction.ListingExchange,
                SecurityISIN=transaction.ISIN,
                ExchangedMoney=cf.GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=1,
                    UnderlyingTradePrice=transaction.Amount * transaction.FXRateToBase,  # TODO: Currency provider
                    UnderlyingCurrency=transaction.Currency,
                    ComissionCurrency=transaction.Currency,
                    ComissionTotal=0,
                    TaxCurrency=transaction.Currency,
                    TaxTotal=0,
                ),
            )

        raise ValueError("Unknow type of Cash Transaction")

    return list(map(mapToGenericDividendLine, cashTransactions))


def convertStockTradesToStockTradeEvents(
    trades: Sequence[s.TradeStock],
) -> Sequence[sgf.TradeEventStagingStockAcquired | sgf.TradeEventStagingStockSold]:

    def convertAcquiredTradeToAcquiredEvent(
        trade: s.TradeStock,
    ) -> sgf.TradeEventStagingStockAcquired:
        converted = sgf.TradeEventStagingStockAcquired(
            ID=trade.TransactionID,
            ISIN=trade.ISIN,
            Ticker=trade.Symbol,
            AssetClass=cf.GenericAssetClass.STOCK,
            Date=trade.DateTime,
            AcquiredReason=cf.GenericTradeReportItemGainType.BOUGHT,  # TODO: Determine reason for acquire
            Multiplier=1,
            ExchangedMoney=cf.GenericMonetaryExchangeInformation(
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
    ) -> sgf.TradeEventStagingStockSold:
        converted = sgf.TradeEventStagingStockSold(
            ID=trade.TransactionID,
            ISIN=trade.ISIN,
            Ticker=trade.Symbol,
            AssetClass=cf.GenericAssetClass.STOCK,
            Date=trade.DateTime,
            Multiplier=1,
            ExchangedMoney=cf.GenericMonetaryExchangeInformation(
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
    ) -> sgf.TradeEventStagingStockSold | sgf.TradeEventStagingStockAcquired:
        buyEvent = trade.Quantity > 0
        if buyEvent:
            return convertAcquiredTradeToAcquiredEvent(trade)
        else:
            return convertSoldTradeToSoldEvent(trade)

    tradeEvents = list(map(convertTradeToTradeEvent, trades))
    return tradeEvents


def convertStockLotsToStockLotEvents(
    lots: Sequence[s.LotStock],
) -> Sequence[sgf.GenericTaxLotEventStaging]:
    def convertSingleLot(lot: s.LotStock) -> sgf.GenericTaxLotEventStaging:
        converted = sgf.GenericTaxLotEventStaging(
            lot.TransactionID,
            ISIN=lot.ISIN,
            Ticker=lot.Symbol,
            Quantity=lot.Quantity,
            Acquired=sgf.GenericTaxLotMatchingDetails(ID=lot.TransactionID, DateTime=None),
            Sold=sgf.GenericTaxLotMatchingDetails(ID=None, DateTime=lot.DateTime),
            ShortLongType=cf.GenericShortLong.LONG,  # TODO: Determine long / short if possible
        )
        return converted

    lotEvents = list(map(convertSingleLot, lots))
    return lotEvents


def convertDerivativeTradesToDerivativeTradeEvents(
    trades: Sequence[s.TradeDerivative],
) -> Sequence[sgf.TradeEventStagingDerivativeAcquired | sgf.TradeEventStagingDerivativeSold]:

    def convertAcquiredTradeToAcquiredEvent(
        trade: s.TradeDerivative,
    ) -> sgf.TradeEventStagingDerivativeAcquired:
        converted = sgf.TradeEventStagingDerivativeAcquired(
            ID=trade.TransactionID,
            ISIN=trade.UnderlyingSecurityID,
            Ticker=trade.UnderlyingSymbol,
            AssetClass=cf.GenericAssetClass.OPTION,  # TODO: Could also be stock but leveraged (multiplier)
            Multiplier=trade.Multiplier,
            AcquiredReason=cf.GenericTradeReportItemGainType.BOUGHT,  # TODO: Determine reason for acquire
            Date=trade.DateTime,
            ExchangedMoney=cf.GenericMonetaryExchangeInformation(
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
    ) -> sgf.TradeEventStagingDerivativeSold:
        converted = sgf.TradeEventStagingDerivativeSold(
            ID=trade.TransactionID,
            ISIN=trade.UnderlyingSecurityID,
            Ticker=trade.UnderlyingSymbol,
            AssetClass=cf.GenericAssetClass.OPTION,
            Multiplier=trade.Multiplier,
            Date=trade.DateTime,
            ExchangedMoney=cf.GenericMonetaryExchangeInformation(
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
    ) -> sgf.TradeEventStagingDerivativeSold | sgf.TradeEventStagingDerivativeAcquired:
        buyEvent = trade.Quantity > 0
        if buyEvent:
            return convertAcquiredTradeToAcquiredEvent(trade)
        else:
            return convertSoldTradeToSoldEvent(trade)

    tradeEvents = list(map(convertTradeToTradeEvent, trades))
    return tradeEvents


def convertDerivativeLotsToDerivativeLotEvents(
    lots: Sequence[s.LotDerivative],
) -> Sequence[sgf.GenericTaxLotEventStaging]:
    def convertSingleLot(lot: s.LotDerivative) -> sgf.GenericTaxLotEventStaging:
        converted = sgf.GenericTaxLotEventStaging(
            lot.TransactionID,
            ISIN=lot.UnderlyingSecurityID,
            Ticker=lot.UnderlyingSymbol,
            Quantity=lot.Quantity,
            Acquired=sgf.GenericTaxLotMatchingDetails(ID=lot.TransactionID, DateTime=None),
            Sold=sgf.GenericTaxLotMatchingDetails(ID=None, DateTime=lot.DateTime),
            ShortLongType=cf.GenericShortLong.LONG,  # TODO: Determine long / short if possible
        )
        return converted

    lotEvents = list(map(convertSingleLot, lots))
    return lotEvents


def convertSegmentedTradesToGenericUnderlyingGroups(
    segmented: st.SegmentedTrades,
) -> Sequence[sgf.GenericUnderlyingGroupingStaging]:
    stockTrades = segmented.stockTrades
    stockLots = segmented.stockLots

    derivativeTrades = segmented.derivativeTrades
    derivativeLots = segmented.derivativeLots

    cashTransactions = segmented.cashTransactions

    stockTrades.sort(key=lambda entry: entry.ISIN)
    stockLots.sort(key=lambda entry: entry.ISIN)
    derivativeTrades.sort(key=lambda entry: entry.UnderlyingSecurityID)
    derivativeLots.sort(key=lambda entry: entry.UnderlyingSecurityID)
    cashTransactions.sort(key=lambda entry: entry.ISIN)

    stockTradeEvents = convertStockTradesToStockTradeEvents(stockTrades)
    stockLotEvents = convertStockLotsToStockLotEvents(stockLots)
    cashTransactionEvents = convertToCashTransactions(cashTransactions)

    derivativeTradeEvents = convertDerivativeTradesToDerivativeTradeEvents(derivativeTrades)
    derivativeLotEvents = convertDerivativeLotsToDerivativeLotEvents(derivativeLots)

    def segmentTradeByIsin(
        trades: list[sgf.GenericTradeEventStaging],
    ) -> dict[str, Sequence[sgf.GenericTradeEventStaging]]:
        segmented: dict[str, Sequence[sgf.GenericTradeEventStaging]] = {}
        for key, valuesiter in groupby(trades, key=lambda trade: trade.ISIN):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    def segmentLotByIsin(
        lots: list[sgf.GenericTaxLotEventStaging],
    ) -> dict[str, Sequence[sgf.GenericTaxLotEventStaging]]:
        segmented: dict[str, Sequence[sgf.GenericTaxLotEventStaging]] = {}
        for key, valuesiter in groupby(lots, key=lambda trade: trade.ISIN):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    def segmentCashTransactionByIsin(
        transactions: list[sgf.TransactionCashStaging],
    ) -> dict[str, Sequence[sgf.TransactionCashStaging]]:
        segmented: dict[str, Sequence[sgf.TransactionCashStaging]] = {}
        for key, valuesiter in groupby(transactions, key=lambda trade: trade.SecurityISIN):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    stocksSegmented = segmentTradeByIsin(stockTradeEvents)  # type: ignore
    stockLotsSegmented = segmentLotByIsin(stockLotEvents)  # type: ignore
    derivativesSegmented = segmentTradeByIsin(derivativeTradeEvents)  # type: ignore
    derivativeLotsSegmented = segmentLotByIsin(derivativeLotEvents)  # type: ignore
    dividendsSegmented = segmentCashTransactionByIsin(cashTransactionEvents)

    allIsinsPresent = list(
        set(
            list(stocksSegmented.keys())
            + list(derivativesSegmented.keys())
            + list(stockLotsSegmented.keys())
            + list(derivativeLotsSegmented.keys())
            + list(dividendsSegmented.keys())
        )
    )

    generatedUnderlyingGroups: Sequence[sgf.GenericUnderlyingGroupingStaging] = list()
    for isin in allIsinsPresent:
        wrapper = sgf.GenericUnderlyingGroupingStaging(
            ISIN=isin,
            CountryOfOrigin=None,
            UnderlyingCategory=cf.GenericCategory.REGULAR,
            StockTrades=stocksSegmented.get(isin, []),  # type: ignore
            StockTaxLots=stockLotsSegmented.get(isin, []),
            DerivativeTrades=derivativesSegmented.get(isin, []),  # type: ignore
            DerivativeTaxLots=derivativeLotsSegmented.get(isin, []),
            Dividends=dividendsSegmented.get(isin, []),
        )
        generatedUnderlyingGroups.append(wrapper)

    return generatedUnderlyingGroups
