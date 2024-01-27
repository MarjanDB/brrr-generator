from ExportProvider.IBRK.Schemas import CashTransaction
from ExportProvider.IBRK.Schemas import CashTransactionType
from ReportingStrategies.GenericFormats import GenericDividendLine
from ReportingStrategies.GenericFormats import GenericDividendLineType
from ReportingStrategies.GenericFormats import GenericDividendType


def getExportGenericDividendLineFromCashTransactions(cashTransactions: list[CashTransaction]) -> list[GenericDividendLine]:

    def mapToGenericDividendLine(transaction: CashTransaction) -> GenericDividendLine:
        edavkiDividendType = GenericDividendType.UNKNOWN

        ordinaryDividend = transaction.Description.__contains__("Ordinary Dividend")
        bonusDividend = transaction.Description.__contains__("Bonus Dividend")

        if ordinaryDividend:
            edavkiDividendType = GenericDividendType.ORDINARY

        if bonusDividend:
            edavkiDividendType = GenericDividendType.BONUS

        dividendMapping = {
            CashTransactionType.DIVIDEND: GenericDividendLineType.DIVIDEND,
            CashTransactionType.WITHOLDING_TAX: GenericDividendLineType.WITHOLDING_TAX
        }


        return GenericDividendLine(
            AccountID = transaction.ClientAccountID,
            LineCurrency = transaction.CurrencyPrimary,
            ConversionToBaseAccountCurrency = transaction.FXRateToBase,
            AccountCurrency = transaction.CurrencyPrimary,
            ReceivedDateTime = transaction.DateTime,
            AmountInCurrency = transaction.Amount,
            DividendActionID = transaction.ActionID,
            SecurityISIN = transaction.ISIN,
            ListingExchange = transaction.ListingExchange,
            DividendType = edavkiDividendType,
            LineType = dividendMapping[transaction.Type]
        )


    return list(map(mapToGenericDividendLine, cashTransactions))