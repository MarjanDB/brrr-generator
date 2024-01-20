import ExportProvider.IBRK.ExportReports.CashTransactions as CT
import ReportingStrategies.Common.Dividend as d

def convertDividendCashTransactionRowToDividend(line: CT.CashTransactionRow) -> d.DividendLine:
    divLine = d.DividendLine()
    divLine.AccountCurrency = line.CurrencyPrimary
    divLine.AccountID = line.ClientAccountID
    divLine.AmountInDividendCurrency = line.Amount
    divLine.ConversionToBaseAccountCurrency = line.FXRateToBase
    divLine.Currency = line.CurrencyPrimary
    divLine.DividendActionID = line.ActionID
    divLine.DividendReceivedDateTime = line.DateAndTime
    divLine.SecurityISIN = line.Isin

    return divLine

def convertWitheldTaxCashTransactionRowToWitheldTax(line: CT.CashTransactionRow) -> d.WitholdingTaxLine:
    taxLine = d.WitholdingTaxLine()
    taxLine.AccountCurrency = line.CurrencyPrimary
    taxLine.AccountID = line.ClientAccountID
    taxLine.AmountInWitholdingTaxCurrency = line.Amount
    taxLine.ConversionToBaseAccountCurrency = line.FXRateToBase
    taxLine.Currency = line.CurrencyPrimary
    taxLine.TaxActionID = line.ActionID
    taxLine.WitholdingTaxReceivedDateTime = line.DateAndTime
    taxLine.SecurityISIN = line.Isin

    return taxLine