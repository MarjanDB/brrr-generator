from ExportProvider.IBRK.Schemas import CashTransaction
from ExportProvider.IBRK.Schemas import CashTransactionType
from ReportingStrategies.Slovenia.Schemas import ExportGenericDividendLine
from ReportingStrategies.Slovenia.Schemas import EdavkiDividendTypes
from ReportingStrategies.Slovenia.Schemas import DividendType


def getExportGenericDividendLineFromCashTransactions(cashTransactions: list[CashTransaction]) -> list[ExportGenericDividendLine]:

    def mapToGenericDividendLine(transaction: CashTransaction) -> ExportGenericDividendLine:
        edavkiDividendType = None

        ordinaryDividend = transaction.Description.__contains__("Ordinary Dividend")
        bonusDividend = transaction.Description.__contains__("Bonus Dividend")

        if ordinaryDividend:
            edavkiDividendType = EdavkiDividendTypes.ORDINARY

        if bonusDividend:
            edavkiDividendType = EdavkiDividendTypes.BONUS

        dividendMapping = {
            CashTransactionType.DIVIDEND: DividendType.DIVIDEND,
            CashTransactionType.WITHOLDING_TAX: DividendType.WITHOLDING_TAX
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
            EdavkiDividendType = edavkiDividendType,
            LineType = DividendType(dividendMapping[transaction.Type])
        )


    return list(map(mapToGenericDividendLine, cashTransactions))