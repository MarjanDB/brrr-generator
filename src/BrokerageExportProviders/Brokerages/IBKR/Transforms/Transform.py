from dataclasses import dataclass
from itertools import groupby
from typing import Generic, Sequence, TypeVar

import BrokerageExportProviders.Brokerages.IBKR.Schemas.Schemas as s
import BrokerageExportProviders.Brokerages.IBKR.Schemas.SegmentedTrades as st
import Core.FinancialEvents.Schemas.CommonFormats as cf
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEvent,
    StagingTradeEventCashTransactionDividend,
    StagingTradeEventCashTransactionPaymentInLieuOfDividends,
    StagingTradeEventCashTransactionWitholdingTax,
    StagingTradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividends,
    StagingTradeEventDerivative,
    StagingTradeEventDerivativeAcquired,
    StagingTradeEventDerivativeSold,
    StagingTradeEventStock,
    StagingTradeEventStockAcquired,
    StagingTradeEventStockSold,
    StagingTransactionCash,
)
from Core.StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping
from Core.StagingFinancialEvents.Schemas.Lots import (
    StagingTaxLot,
    StagingTaxLotMatchingDetails,
)

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
) -> list[StagingTransactionCash]:
    def mapToGenericDividendLine(
        transaction: s.TransactionCash,
    ) -> StagingTransactionCash:
        dividendType = cf.GenericDividendType.UNKNOWN

        ordinaryDividend = transaction.Description.lower().__contains__("ordinary dividend")
        bonusDividend = transaction.Description.lower().__contains__("bonus dividend")
        witholdingTaxForPaymentInLieuOfDividends = transaction.Description.lower().__contains__("payment in lieu of dividend")

        if ordinaryDividend:
            dividendType = cf.GenericDividendType.ORDINARY

        if bonusDividend:
            dividendType = cf.GenericDividendType.BONUS

        if transaction.Type == s.CashTransactionType.DIVIDEND:
            return StagingTradeEventCashTransactionDividend(
                ID=transaction.TransactionID,
                ISIN=transaction.ISIN,
                Ticker=transaction.Symbol,
                AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
                Date=transaction.DateTime,
                Multiplier=1,
                DividendType=dividendType,
                ExchangedMoney=cf.GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=1,
                    UnderlyingTradePrice=transaction.Amount * transaction.FXRateToBase,  # TODO: Currency provider
                    UnderlyingCurrency=transaction.Currency,
                    ComissionCurrency=transaction.Currency,
                    ComissionTotal=0,
                    TaxCurrency=transaction.Currency,
                    TaxTotal=0,
                    FxRateToBase=transaction.FXRateToBase,
                ),
                ActionID=transaction.ActionID,
                TransactionID=transaction.TransactionID,
                ListingExchange=transaction.ListingExchange,
            )

        if transaction.Type == s.CashTransactionType.WITHOLDING_TAX and witholdingTaxForPaymentInLieuOfDividends:
            return StagingTradeEventCashTransactionWitholdingTaxForPaymentInLieuOfDividends(
                ID=transaction.TransactionID,
                ISIN=transaction.ISIN,
                Ticker=transaction.Symbol,
                AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
                Date=transaction.DateTime,
                Multiplier=1,
                ExchangedMoney=cf.GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=1,
                    UnderlyingTradePrice=transaction.Amount * transaction.FXRateToBase,  # TODO: Currency provider
                    UnderlyingCurrency=transaction.Currency,
                    ComissionCurrency=transaction.Currency,
                    ComissionTotal=0,
                    TaxCurrency=transaction.Currency,
                    TaxTotal=0,
                    FxRateToBase=transaction.FXRateToBase,
                ),
                ActionID=transaction.ActionID,
                TransactionID=transaction.TransactionID,
                ListingExchange=transaction.ListingExchange,
            )

        if transaction.Type == s.CashTransactionType.WITHOLDING_TAX:
            return StagingTradeEventCashTransactionWitholdingTax(
                ID=transaction.TransactionID,
                ISIN=transaction.ISIN,
                Ticker=transaction.Symbol,
                AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
                Date=transaction.DateTime,
                Multiplier=1,
                ExchangedMoney=cf.GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=1,
                    UnderlyingTradePrice=transaction.Amount * transaction.FXRateToBase,  # TODO: Currency provider
                    UnderlyingCurrency=transaction.Currency,
                    ComissionCurrency=transaction.Currency,
                    ComissionTotal=0,
                    TaxCurrency=transaction.Currency,
                    TaxTotal=0,
                    FxRateToBase=transaction.FXRateToBase,
                ),
                ActionID=transaction.ActionID,
                TransactionID=transaction.TransactionID,
                ListingExchange=transaction.ListingExchange,
            )

        if transaction.Type == s.CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS:
            return StagingTradeEventCashTransactionPaymentInLieuOfDividends(
                ID=transaction.TransactionID,
                ISIN=transaction.ISIN,
                Ticker=transaction.Symbol,
                AssetClass=cf.GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
                Date=transaction.DateTime,
                Multiplier=1,
                DividendType=dividendType,
                ExchangedMoney=cf.GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=1,
                    UnderlyingTradePrice=transaction.Amount * transaction.FXRateToBase,  # TODO: Currency provider
                    UnderlyingCurrency=transaction.Currency,
                    ComissionCurrency=transaction.Currency,
                    ComissionTotal=0,
                    TaxCurrency=transaction.Currency,
                    TaxTotal=0,
                    FxRateToBase=transaction.FXRateToBase,
                ),
                ActionID=transaction.ActionID,
                TransactionID=transaction.TransactionID,
                ListingExchange=transaction.ListingExchange,
            )

        raise ValueError("Unknow type of Cash Transaction")

    return list(map(mapToGenericDividendLine, cashTransactions))


def convertStockTradesToStockTradeEvents(
    trades: Sequence[s.TradeStock],
) -> Sequence[StagingTradeEventStock]:

    def convertAcquiredTradeToAcquiredEvent(
        trade: s.TradeStock,
    ) -> StagingTradeEventStockAcquired:
        converted = StagingTradeEventStockAcquired(
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
                FxRateToBase=trade.FXRateToBase,
            ),
        )
        return converted

    def convertSoldTradeToSoldEvent(
        trade: s.TradeStock,
    ) -> StagingTradeEventStockSold:
        converted = StagingTradeEventStockSold(
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
                FxRateToBase=trade.FXRateToBase,
            ),
        )
        return converted

    def convertTradeToTradeEvent(
        trade: s.TradeStock,
    ) -> StagingTradeEventStock:
        buyEvent = trade.Quantity > 0
        if buyEvent:
            return convertAcquiredTradeToAcquiredEvent(trade)
        else:
            return convertSoldTradeToSoldEvent(trade)

    tradeEvents = list(map(convertTradeToTradeEvent, trades))
    return tradeEvents


def convertStockLotsToStockLotEvents(
    lots: Sequence[s.LotStock],
) -> Sequence[StagingTaxLot]:
    def convertSingleLot(lot: s.LotStock) -> StagingTaxLot:
        converted = StagingTaxLot(
            lot.TransactionID,
            ISIN=lot.ISIN,
            Ticker=lot.Symbol,
            Quantity=lot.Quantity,
            Acquired=StagingTaxLotMatchingDetails(ID=lot.TransactionID, DateTime=None),
            Sold=StagingTaxLotMatchingDetails(ID=None, DateTime=lot.DateTime),
            ShortLongType=cf.GenericShortLong.LONG,  # TODO: Determine long / short if possible
        )
        return converted

    lotEvents = list(map(convertSingleLot, lots))
    return lotEvents


def convertDerivativeTradesToDerivativeTradeEvents(
    trades: Sequence[s.TradeDerivative],
) -> Sequence[StagingTradeEventDerivative]:

    def convertAcquiredTradeToAcquiredEvent(
        trade: s.TradeDerivative,
    ) -> StagingTradeEventDerivativeAcquired:
        converted = StagingTradeEventDerivativeAcquired(
            ID=trade.TransactionID,
            ISIN=trade.UnderlyingSecurityID,
            Ticker=trade.UnderlyingSymbol,
            AssetClass=cf.GenericAssetClass.OPTION,  # TODO: Could also be stock but leveraged (multiplier)
            Multiplier=trade.Multiplier,
            AcquiredReason=cf.GenericDerivativeReportItemGainType.BOUGHT,  # TODO: Determine reason for acquire
            Date=trade.DateTime,
            ExchangedMoney=cf.GenericMonetaryExchangeInformation(
                UnderlyingCurrency=trade.Currency,
                UnderlyingQuantity=trade.Quantity,
                UnderlyingTradePrice=trade.TradePrice * trade.FXRateToBase,  # TODO: Remove in favor of currency conversion provider
                ComissionCurrency=trade.IBCommissionCurrency,
                ComissionTotal=trade.IBCommission,
                TaxCurrency=trade.Currency,  # NOTE: Taxes Currency == Trade Currency ??
                TaxTotal=trade.Taxes,
                FxRateToBase=trade.FXRateToBase,
            ),
        )
        return converted

    def convertSoldTradeToSoldEvent(
        trade: s.TradeDerivative,
    ) -> StagingTradeEventDerivativeSold:
        converted = StagingTradeEventDerivativeSold(
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
                FxRateToBase=trade.FXRateToBase,
            ),
        )
        return converted

    def convertTradeToTradeEvent(
        trade: s.TradeDerivative,
    ) -> StagingTradeEventDerivative:
        buyEvent = trade.Quantity > 0
        if buyEvent:
            return convertAcquiredTradeToAcquiredEvent(trade)
        else:
            return convertSoldTradeToSoldEvent(trade)

    tradeEvents = list(map(convertTradeToTradeEvent, trades))
    return tradeEvents


def convertDerivativeLotsToDerivativeLotEvents(
    lots: Sequence[s.LotDerivative],
) -> Sequence[StagingTaxLot]:
    def convertSingleLot(lot: s.LotDerivative) -> StagingTaxLot:
        converted = StagingTaxLot(
            lot.TransactionID,
            ISIN=lot.UnderlyingSecurityID,
            Ticker=lot.UnderlyingSymbol,
            Quantity=lot.Quantity,
            Acquired=StagingTaxLotMatchingDetails(ID=lot.TransactionID, DateTime=None),
            Sold=StagingTaxLotMatchingDetails(ID=None, DateTime=lot.DateTime),
            ShortLongType=cf.GenericShortLong.LONG,  # TODO: Determine long / short if possible
        )
        return converted

    lotEvents = list(map(convertSingleLot, lots))
    return lotEvents


def convertSegmentedTradesToGenericUnderlyingGroups(
    segmented: st.SegmentedTrades,
) -> Sequence[StagingFinancialGrouping]:
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
        trades: list[StagingTradeEvent],
    ) -> dict[str, Sequence[StagingTradeEvent]]:
        segmented: dict[str, Sequence[StagingTradeEvent]] = {}
        for key, valuesiter in groupby(trades, key=lambda trade: trade.ISIN):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    def segmentLotByIsin(
        lots: list[StagingTaxLot],
    ) -> dict[str, Sequence[StagingTaxLot]]:
        segmented: dict[str, Sequence[StagingTaxLot]] = {}
        for key, valuesiter in groupby(lots, key=lambda trade: trade.ISIN):
            segmented[key] = list(v for v in valuesiter)
        return segmented

    stocksSegmented = segmentTradeByIsin(stockTradeEvents)  # type: ignore
    stockLotsSegmented = segmentLotByIsin(stockLotEvents)  # type: ignore
    derivativesSegmented = segmentTradeByIsin(derivativeTradeEvents)  # type: ignore
    derivativeLotsSegmented = segmentLotByIsin(derivativeLotEvents)  # type: ignore
    dividendsSegmented = segmentTradeByIsin(cashTransactionEvents)  # type: ignore

    allIsinsPresent = list(
        set(
            list(stocksSegmented.keys())
            + list(derivativesSegmented.keys())
            + list(stockLotsSegmented.keys())
            + list(derivativeLotsSegmented.keys())
            + list(dividendsSegmented.keys())
        )
    )

    generatedUnderlyingGroups: Sequence[StagingFinancialGrouping] = list()
    for isin in allIsinsPresent:
        wrapper = StagingFinancialGrouping(
            ISIN=isin,
            CountryOfOrigin=None,
            UnderlyingCategory=cf.GenericCategory.REGULAR,
            StockTrades=stocksSegmented.get(isin, []),  # type: ignore
            StockTaxLots=stockLotsSegmented.get(isin, []),
            DerivativeTrades=derivativesSegmented.get(isin, []),  # type: ignore
            DerivativeTaxLots=derivativeLotsSegmented.get(isin, []),
            CashTransactions=dividendsSegmented.get(isin, []),  # type: ignore
        )
        generatedUnderlyingGroups.append(wrapper)

    return generatedUnderlyingGroups
