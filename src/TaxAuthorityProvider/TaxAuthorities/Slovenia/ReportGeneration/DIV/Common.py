from itertools import groupby
from typing import Sequence

from arrow import Arrow

import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import TaxAuthorityProvider.Schemas.Configuration as tc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss
from AppModule import appInjector
from InfoProviders.InfoLookupProvider import (
    CompanyInfo,
    CompanyLookupProvider,
    CountryLookupProvider,
    TreatyType,
)


def filterOutCashTransactionsBasedOnDate(
    data: Sequence[pgf.GenericTransactionCash], fromDateInclusive: Arrow, toDateExclusive: Arrow
) -> Sequence[pgf.GenericTransactionCash]:
    linesThatFallIntoDate = list(
        filter(lambda line: line.ReceivedDateTime >= fromDateInclusive and line.ReceivedDateTime < toDateExclusive, data)
    )
    return linesThatFallIntoDate


def processEdavkiLineItemsFromCashTransactions(
    dividendLines: Sequence[pgf.TransactionCashDividend], witholdingLines: Sequence[pgf.TransactionCashWitholdingTax]
) -> Sequence[ss.EDavkiDividendReportLine]:
    actionToDividendMapping: dict[str, ss.EDavkiDividendReportLine] = dict()

    for dividend in dividendLines:
        actionId = dividend.ActionID

        thisDividendLine = ss.EDavkiDividendReportLine(
            DateReceived=dividend.ReceivedDateTime,
            TaxNumberForDividendPayer="",
            DividendPayerIdentificationNumber=dividend.SecurityISIN,
            DividendPayerTitle="",
            DividendPayerAddress="",
            DividendPayerCountryOfOrigin="",
            DividendType=ss.EDavkiDividendType(dividend.DividendType),
            CountryOfOrigin="",
            DividendIdentifierForTracking=actionId,
            TaxReliefParagraphInInternationalTreaty="",
            DividendAmount=dividend.ExchangedMoney.UnderlyingQuantity * dividend.ExchangedMoney.UnderlyingTradePrice,
            ForeignTaxPaid=dividend.ExchangedMoney.TaxTotal,
        )

        if actionToDividendMapping.get(actionId) is None:
            actionToDividendMapping[actionId] = thisDividendLine
            continue

        actionToDividendMapping[actionId].DividendAmount += (
            dividend.ExchangedMoney.UnderlyingQuantity * dividend.ExchangedMoney.UnderlyingTradePrice
        )

    for withheldTax in witholdingLines:
        actionId = withheldTax.ActionID

        # Can't get witholding Tax for a dividend that did not occur
        if actionToDividendMapping.get(actionId) is None:
            raise ValueError("Edge case where Witholding Tax has no matching Dividend Cash Transaction")

        actionToDividendMapping[actionId].ForeignTaxPaid += (
            withheldTax.ExchangedMoney.UnderlyingQuantity * withheldTax.ExchangedMoney.UnderlyingTradePrice
        )

    createdLines = list(actionToDividendMapping.values())
    return createdLines


def mergeDividendsReceivedOnSameDayForSingleIsin(dividends: Sequence[ss.EDavkiDividendReportLine]) -> Sequence[ss.EDavkiDividendReportLine]:
    segmented: dict[str, list[ss.EDavkiDividendReportLine]] = {}

    dividendsSorted = list(dividends)
    dividendsSorted.sort(
        key=lambda dividend: "{}-{}-{}".format(
            dividend.DateReceived,
            dividend.DividendType,
            dividend.DividendPayerAddress,
        )
    )

    for key, valuesiter in groupby(
        dividendsSorted,
        key=lambda dividend: "{}-{}-{}".format(
            dividend.DateReceived,
            dividend.DividendType,
            dividend.DividendPayerAddress,
        ),
    ):
        segmented[key] = list(v for v in valuesiter)

    mergedDividends: list[ss.EDavkiDividendReportLine] = list()

    for dividendList in segmented.values():
        combinedTotal = sum(map(lambda dividend: dividend.DividendAmount, dividendList))
        combinedTotalTax = sum(map(lambda dividend: dividend.ForeignTaxPaid, dividendList))

        combinedTracking = "-".join(
            list(
                map(
                    lambda dividend: dividend.DividendIdentifierForTracking,
                    dividendList,
                )
            )
        )

        generatedMerged = ss.EDavkiDividendReportLine(
            DateReceived=dividendList[0].DateReceived,
            TaxNumberForDividendPayer=dividendList[0].TaxNumberForDividendPayer,
            DividendPayerIdentificationNumber=dividendList[0].DividendPayerIdentificationNumber,
            DividendPayerTitle=dividendList[0].DividendPayerTitle,
            DividendPayerAddress=dividendList[0].DividendPayerAddress,
            DividendPayerCountryOfOrigin=dividendList[0].DividendPayerCountryOfOrigin,
            DividendType=dividendList[0].DividendType,
            CountryOfOrigin=dividendList[0].CountryOfOrigin,
            DividendIdentifierForTracking=combinedTracking,
            TaxReliefParagraphInInternationalTreaty=dividendList[0].TaxReliefParagraphInInternationalTreaty,
            DividendAmount=combinedTotal,
            ForeignTaxPaid=combinedTotalTax,
        )

        mergedDividends.append(generatedMerged)

    return mergedDividends


def fillInMissingCompanyInformationForDividendLineAndRoundAmounts(
    lines: Sequence[ss.EDavkiDividendReportLine],
) -> Sequence[ss.EDavkiDividendReportLine]:
    companyLookupProvider = appInjector.inject(CompanyLookupProvider)
    countryLookupProvider = appInjector.inject(CountryLookupProvider)

    if len(lines) == 0:
        return lines

    firstLine = lines[0]
    responsibleCompany: CompanyInfo | None = None

    DividendPayerTitle = ""
    DividendPayerCountryOfOrigin = ""
    CountryOfOrigin = ""
    DividendPayerAddress = ""
    TaxReliefParagraphInInternationalTreaty: str | None = None

    try:
        responsibleCompany = companyLookupProvider.getCompanyInfo(firstLine.DividendPayerIdentificationNumber)

        DividendPayerTitle = responsibleCompany.LongName

        DividendPayerCountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2
        CountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2
        DividendPayerAddress = responsibleCompany.Location.formatAsUnternationalAddress()

        relevantCountry = countryLookupProvider.getCountry(responsibleCompany.Location.Country)
        treaty = relevantCountry.treaties.get(TreatyType.TaxRelief)

        TaxReliefParagraphInInternationalTreaty = treaty

    except Exception as e:
        print("Failed for ISIN: " + firstLine.DividendPayerIdentificationNumber)
        print(e)

    for dividendLine in lines:
        dividendLine.DividendAmount = dividendLine.DividendAmount.__round__(2)
        dividendLine.ForeignTaxPaid = dividendLine.ForeignTaxPaid.__abs__().__round__(2)
        dividendLine.DividendPayerTitle = DividendPayerTitle
        dividendLine.DividendPayerCountryOfOrigin = DividendPayerCountryOfOrigin
        dividendLine.CountryOfOrigin = CountryOfOrigin
        dividendLine.DividendPayerAddress = DividendPayerAddress
        dividendLine.TaxReliefParagraphInInternationalTreaty = TaxReliefParagraphInInternationalTreaty

    return lines


def processSingleUnderlyingGroupingToDivLines(
    reportConfig: tc.TaxAuthorityConfiguration, data: pgf.UnderlyingGrouping
) -> Sequence[ss.EDavkiDividendReportLine]:
    relevantCashTransactions = filterOutCashTransactionsBasedOnDate(data.CashTransactions, reportConfig.fromDate, reportConfig.toDate)

    dividendLines: list[pgf.TransactionCashDividend] = list(
        filter(lambda line: isinstance(line, pgf.TransactionCashDividend), relevantCashTransactions)
    )  # pyright: ignore[reportAssignmentType]

    witholdingTax: list[pgf.TransactionCashWitholdingTax] = list(
        filter(lambda line: isinstance(line, pgf.TransactionCashWitholdingTax), relevantCashTransactions)
    )  # pyright: ignore[reportAssignmentType]

    processedDividendLines = processEdavkiLineItemsFromCashTransactions(dividendLines, witholdingTax)

    combinedLines = mergeDividendsReceivedOnSameDayForSingleIsin(processedDividendLines)

    linesWithInformationFilledOut = fillInMissingCompanyInformationForDividendLineAndRoundAmounts(combinedLines)

    return linesWithInformationFilledOut


def convertCashTransactionsToDivItems(
    reportConfig: tc.TaxAuthorityConfiguration, data: Sequence[pgf.UnderlyingGrouping]
) -> Sequence[ss.EDavkiDividendReportLine]:
    allLines: list[ss.EDavkiDividendReportLine] = []

    for grouping in data:
        divLinesForGrouping = list(processSingleUnderlyingGroupingToDivLines(reportConfig=reportConfig, data=grouping))
        allLines = allLines + divLinesForGrouping

    return allLines
