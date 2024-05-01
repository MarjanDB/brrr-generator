import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
from Core.FinancialEvents.Schemas.CommonFormats import (
    GenericMonetaryExchangeInformation,
)
from Core.StagingFinancialEvents.Contracts.EventProcessor import EventProcessor
from Core.StagingFinancialEvents.Schemas.Events import (
    StagingTradeEventCashTransaction,
    StagingTradeEventCashTransactionDividend,
    StagingTradeEventCashTransactionWitholdingTax,
)


class CashTransactionEventProcessor(EventProcessor[StagingTradeEventCashTransaction, pgf.TransactionCash]):

    def process(self, input: StagingTradeEventCashTransaction) -> pgf.TransactionCash:
        if isinstance(input, StagingTradeEventCashTransactionDividend):
            converted = pgf.TransactionCashDividend(
                AccountID="",
                ReceivedDateTime=input.Date,
                ActionID=input.ActionID,
                TransactionID=input.TransactionID,
                ListingExchange=input.ListingExchange,
                DividendType=input.DividendType,
                SecurityISIN=input.ISIN,
                ExchangedMoney=GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=input.ExchangedMoney.UnderlyingQuantity,
                    UnderlyingTradePrice=input.ExchangedMoney.UnderlyingTradePrice,
                    UnderlyingCurrency=input.ExchangedMoney.UnderlyingCurrency,
                    ComissionCurrency=input.ExchangedMoney.ComissionCurrency,
                    ComissionTotal=input.ExchangedMoney.ComissionTotal,
                    TaxCurrency=input.ExchangedMoney.TaxCurrency,
                    TaxTotal=input.ExchangedMoney.TaxTotal,
                ),
            )
            return converted

        if isinstance(input, StagingTradeEventCashTransactionWitholdingTax):  # pyright: ignore[reportUnnecessaryIsInstance]
            converted = pgf.TransactionCashWitholdingTax(
                AccountID="",
                ReceivedDateTime=input.Date,
                ActionID=input.ActionID,
                TransactionID=input.TransactionID,
                ListingExchange=input.ListingExchange,
                SecurityISIN=input.ISIN,
                ExchangedMoney=GenericMonetaryExchangeInformation(
                    UnderlyingQuantity=input.ExchangedMoney.UnderlyingQuantity,
                    UnderlyingTradePrice=input.ExchangedMoney.UnderlyingTradePrice,
                    UnderlyingCurrency=input.ExchangedMoney.UnderlyingCurrency,
                    ComissionCurrency=input.ExchangedMoney.ComissionCurrency,
                    ComissionTotal=input.ExchangedMoney.ComissionTotal,
                    TaxCurrency=input.ExchangedMoney.TaxCurrency,
                    TaxTotal=input.ExchangedMoney.TaxTotal,
                ),
            )
            return converted

        raise ValueError("Unknown Cash Transaction Staging type")
