from typing import Sequence

import pandas as pd

import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss


def generateDataFrameReport(divLines: Sequence[ss.EDavkiDividendReportLine]) -> pd.DataFrame:
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
            "Znesek dividend (v Originalni Valuti)": data.DividendAmountInOriginalCurrency,
            "Tuji davek (v EUR)": data.ForeignTaxPaid,
            "Tuji davek (v Originalni Valuti)": data.ForeignTaxPaidInOriginalCurrency,
            "Država vira": data.CountryOfOrigin,
            "Uveljavljam oprostitev po mednarodni pogodbi": data.TaxReliefParagraphInInternationalTreaty,
            "Action Tracking": data.DividendIdentifierForTracking,
        }
        return converted

    dataAsDict = list(map(convertToDict, divLines))
    dataframe = pd.DataFrame.from_records(dataAsDict)
    return dataframe
