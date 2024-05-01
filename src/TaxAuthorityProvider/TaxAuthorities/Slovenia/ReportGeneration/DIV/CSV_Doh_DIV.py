from typing import Sequence

import pandas as pd

import Core.FinancialEvents.Schemas.Grouping as pgf
import TaxAuthorityProvider.Schemas.Configuration as tc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration.DIV.Common as common
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss


def generateDataFrameReport(reportConfig: tc.TaxAuthorityConfiguration, data: Sequence[pgf.FinancialGrouping]) -> pd.DataFrame:
    convertedTrades = common.convertCashTransactionsToDivItems(reportConfig, data)

    def convertToDict(data: ss.EDavkiDividendReportLine):
        converted = {
            "Datum prejema dividend": data.DateReceived.format("YYYY-MM-DD"),
            "Davčna številka izplačevalca dividend": data.TaxNumberForDividendPayer,
            "Identifikacijska številka izplačevalca dividend": data.DividendPayerIdentificationNumber,
            "Naziv izplačevalca dividend": data.DividendPayerTitle,
            "Naslov izplačevalca dividend": data.DividendPayerAddress,
            "Država izplačevalca dividend": data.DividendPayerCountryOfOrigin,
            "Šifra vrste dividend": data.DividendType.value,
            "Znesek dividend (v EUR)": data.DividendAmount,
            "Tuji davek (v EUR)": data.ForeignTaxPaid,
            "Država vira": data.CountryOfOrigin,
            "Uveljavljam oprostitev po mednarodni pogodbi": data.TaxReliefParagraphInInternationalTreaty,
            "Action Tracking": data.DividendIdentifierForTracking,
        }
        return converted

    dataAsDict = list(map(convertToDict, convertedTrades))
    dataframe = pd.DataFrame.from_records(dataAsDict)
    return dataframe
