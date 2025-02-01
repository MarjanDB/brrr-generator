import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Schemas.CommonFormats import (
    GenericMonetaryExchangeInformation,
)
from Core.FinancialEvents.Schemas.Events import (
    TradeEventCashTransactionDividend,
    TradeEventCashTransactionPaymentInLieuOfDividend,
    TradeEventCashTransactionWitholdingTax,
)
from Core.StagingFinancialEvents.Contracts.EventProcessor import EventProcessor
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventCashTransaction,
    StagingTradeEventCashTransactionDividend,
    StagingTradeEventCashTransactionPaymentInLieuOfDividends,
    StagingTradeEventCashTransactionWitholdingTax,
)


class CashTransactionEventProcessor(EventProcessor[StagingTradeEventCashTransaction, pgf.TransactionCash]):

    def process(self, input: StagingTradeEventCashTransaction) -> pgf.TransactionCash:
        if isinstance(input, StagingTradeEventCashTransactionDividend):
            converted = TradeEventCashTransactionDividend(
                ID=input.ID,
                ISIN=input.ISIN,
                Ticker=input.Ticker or "",
                AssetClass=input.AssetClass,
                Date=input.Date,
                Multiplier=input.Multiplier,
                ExchangedMoney=GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=input.ExchangedMoney.UnderlyingQuantity,
                    UnderlyingTradePrice=input.ExchangedMoney.UnderlyingTradePrice,
                    UnderlyingCurrency=input.ExchangedMoney.UnderlyingCurrency,
                    ComissionCurrency=input.ExchangedMoney.ComissionCurrency,
                    ComissionTotal=input.ExchangedMoney.ComissionTotal,
                    TaxCurrency=input.ExchangedMoney.TaxCurrency,
                    TaxTotal=input.ExchangedMoney.TaxTotal,
                    FxRateToBase=input.ExchangedMoney.FxRateToBase,
                ),
                ActionID=input.ActionID,
                TransactionID=input.TransactionID,
                ListingExchange=input.ListingExchange,
                DividendType=input.DividendType,
            )
            return converted

        if isinstance(input, StagingTradeEventCashTransactionWitholdingTax):  # pyright: ignore[reportUnnecessaryIsInstance]
            converted = TradeEventCashTransactionWitholdingTax(
                ID=input.ID,
                ISIN=input.ISIN,
                Ticker=input.Ticker or "",
                AssetClass=input.AssetClass,
                Date=input.Date,
                Multiplier=input.Multiplier,
                ExchangedMoney=GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=input.ExchangedMoney.UnderlyingQuantity,
                    UnderlyingTradePrice=input.ExchangedMoney.UnderlyingTradePrice,
                    UnderlyingCurrency=input.ExchangedMoney.UnderlyingCurrency,
                    ComissionCurrency=input.ExchangedMoney.ComissionCurrency,
                    ComissionTotal=input.ExchangedMoney.ComissionTotal,
                    TaxCurrency=input.ExchangedMoney.TaxCurrency,
                    TaxTotal=input.ExchangedMoney.TaxTotal,
                    FxRateToBase=input.ExchangedMoney.FxRateToBase,
                ),
                ActionID=input.ActionID,
                TransactionID=input.TransactionID,
                ListingExchange=input.ListingExchange,
            )
            return converted

        if isinstance(input, StagingTradeEventCashTransactionPaymentInLieuOfDividends):  # pyright: ignore[reportUnnecessaryIsInstance]
            converted = TradeEventCashTransactionPaymentInLieuOfDividend(
                ID=input.ID,
                ISIN=input.ISIN,
                Ticker=input.Ticker or "",
                AssetClass=input.AssetClass,
                Date=input.Date,
                Multiplier=input.Multiplier,
                ExchangedMoney=GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=input.ExchangedMoney.UnderlyingQuantity,
                    UnderlyingTradePrice=input.ExchangedMoney.UnderlyingTradePrice,
                    UnderlyingCurrency=input.ExchangedMoney.UnderlyingCurrency,
                    ComissionCurrency=input.ExchangedMoney.ComissionCurrency,
                    ComissionTotal=input.ExchangedMoney.ComissionTotal,
                    TaxCurrency=input.ExchangedMoney.TaxCurrency,
                    TaxTotal=input.ExchangedMoney.TaxTotal,
                    FxRateToBase=input.ExchangedMoney.FxRateToBase,
                ),
                ActionID=input.ActionID,
                TransactionID=input.TransactionID,
                ListingExchange=input.ListingExchange,
                DividendType=input.DividendType,
            )
            return converted

        raise ValueError("Unknown Cash Transaction Staging type")
