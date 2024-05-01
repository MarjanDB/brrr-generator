from typing import Sequence

import pandas as pd

import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import TaxAuthorityProvider.Schemas.Configuration as tc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration.IFI.Common as common
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss
from Core.FinancialEvents.GroupingProcessor.CountedGroupingProcessor import (
    CountedGroupingProcessor,
)


# NOTE: When comparing with exports from IBKR, take the realized P/L and add comissions. EDavki does reporting based on Trade Price, not Cost Basis !!!
# The generated reports are going to show you made more money than you really did because Slovenia recognizes 1% of the Trade Price as the costs associated with buying/selling of the underlying.
def generateDataFrameReport(
    reportConfig: tc.TaxAuthorityConfiguration, data: Sequence[pgf.UnderlyingGrouping], countedProcessor: CountedGroupingProcessor
) -> pd.DataFrame:
    convertedTrades = common.convertTradesToIfiItems(reportConfig, data, countedProcessor)

    def getLinesFromData(
        entry: ss.EDavkiGenericDerivativeReportItem,
    ) -> pd.DataFrame:

        lines = pd.DataFrame(entry.Items)
        lines["ISIN"] = entry.ISIN
        lines["Ticker"] = entry.Code
        lines["HasForeignTax"] = entry.HasForeignTax
        lines["ForeignTax"] = entry.ForeignTax
        lines["ForeignTaxCountryID"] = entry.FTCountryID
        lines["ForeignTaxCountryName"] = entry.FTCountryName

        return lines

    mappedData = list(map(getLinesFromData, convertedTrades))

    if len(mappedData) == 0:
        return pd.DataFrame()

    combinedData = pd.concat(mappedData)

    return combinedData
