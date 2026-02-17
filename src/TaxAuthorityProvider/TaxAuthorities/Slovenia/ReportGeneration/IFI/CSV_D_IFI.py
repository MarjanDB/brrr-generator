from typing import Sequence

import pandas as pd

import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss


# NOTE: When comparing with exports from IBKR, take the realized P/L and add comissions. EDavki does reporting based on Trade Price, not Cost Basis !!!
# The generated reports are going to show you made more money than you really did because Slovenia recognizes 1% of the Trade Price as the costs associated with buying/selling of the underlying.
def generateDataFrameReport(convertedTrades: Sequence[ss.EDavkiGenericDerivativeReportItem]) -> pd.DataFrame:
    def getLinesFromData(
        entry: ss.EDavkiGenericDerivativeReportItem,
    ) -> pd.DataFrame:

        lines = pd.DataFrame(entry.Items)
        lines["ISIN"] = entry.ISIN
        lines["Ticker"] = entry.Code
        lines["Name"] = entry.Name
        lines["HasForeignTax"] = entry.HasForeignTax
        lines["ForeignTax"] = entry.ForeignTax
        lines["ForeignTaxCountryID"] = entry.FTCountryID
        lines["ForeignTaxCountryName"] = entry.FTCountryName

        return lines

    mappedData = list(map(getLinesFromData, convertedTrades))

    if len(mappedData) == 0:
        return pd.DataFrame()

    combinedData = pd.concat(mappedData)

    combinedData.insert(0, "Name", combinedData.pop("Name"))

    return combinedData
