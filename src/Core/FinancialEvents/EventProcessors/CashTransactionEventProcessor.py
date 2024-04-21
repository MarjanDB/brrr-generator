import src.Core.FinancialEvents.Contracts.EventProcessor as ep
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf
from src.Core.FinancialEvents.Schemas.CommonFormats import (
    GenericMonetaryExchangeInformation,
)


class CashTransactionEventProcessor(ep.EventProcessor[sgf.TransactionCashStaging, pgf.TransactionCash]):

    def process(self, input: sgf.TransactionCashStaging) -> pgf.TransactionCash:
        if isinstance(input, sgf.TransactionCashStagingDividend):
            converted = pgf.TransactionCashDividend(
                AccountID=input.AccountID,
                ReceivedDateTime=input.ReceivedDateTime,
                ActionID=input.ActionID,
                TransactionID=input.TransactionID,
                ListingExchange=input.ListingExchange,
                DividendType=input.DividendType,
                SecurityISIN=input.SecurityISIN,
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

        if isinstance(input, sgf.TransactionCashStagingWitholdingTax):  # pyright: ignore[reportUnnecessaryIsInstance]
            converted = pgf.TransactionCashWitholdingTax(
                AccountID=input.AccountID,
                ReceivedDateTime=input.ReceivedDateTime,
                ActionID=input.ActionID,
                TransactionID=input.TransactionID,
                ListingExchange=input.ListingExchange,
                SecurityISIN=input.SecurityISIN,
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
