from ExportProvider.IBRK.Schemas import CashTransaction
from ExportProvider.IBRK.Schemas import CashTransactionType
from ReportingStrategies.Slovenia.Schemas import ExportGenericDividendLine
from ReportingStrategies.Slovenia.Schemas import EDavkiDividendTypes
from ReportingStrategies.Slovenia.Schemas import DividendLineType


def getExportGenericDividendLineFromCashTransactions(cashTransactions: list[CashTransaction]) -> list[ExportGenericDividendLine]:

    def mapToGenericDividendLine(transaction: CashTransaction) -> ExportGenericDividendLine:
        edavkiDividendType = EDavkiDividendTypes.UNKNOWN

        ordinaryDividend = transaction.Description.__contains__("Ordinary Dividend")
        bonusDividend = transaction.Description.__contains__("Bonus Dividend")

        if ordinaryDividend:
            edavkiDividendType = EDavkiDividendTypes.ORDINARY

        if bonusDividend:
            edavkiDividendType = EDavkiDividendTypes.BONUS

        dividendMapping = {
            CashTransactionType.DIVIDEND: DividendLineType.DIVIDEND,
            CashTransactionType.WITHOLDING_TAX: DividendLineType.WITHOLDING_TAX
        }


        return ExportGenericDividendLine(
            AccountID = transaction.ClientAccountID,
            LineCurrency = transaction.CurrencyPrimary,
            ConversionToBaseAccountCurrency = transaction.FXRateToBase,
            AccountCurrency = transaction.CurrencyPrimary,
            ReceivedDateTime = transaction.DateTime,
            AmountInCurrency = transaction.Amount,
            DividendActionID = transaction.ActionID,
            SecurityISIN = transaction.ISIN,
            ListingExchange = transaction.ListingExchange,
            EDavkiDividendType = edavkiDividendType,
            LineType = dividendMapping[transaction.Type]
        )


    return list(map(mapToGenericDividendLine, cashTransactions))