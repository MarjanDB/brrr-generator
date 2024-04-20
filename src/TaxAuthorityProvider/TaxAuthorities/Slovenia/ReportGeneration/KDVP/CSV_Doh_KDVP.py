from typing import Sequence

import pandas as pd

import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.TaxAuthorityProvider.Schemas.Configuration as tc
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration.KDVP.Common as common
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss
from src.Core.FinancialEvents.GroupingProcessor.CountedGroupingProcessor import (
    CountedGroupingProcessor,
)


# NOTE: When comparing with exports from IBKR, take the realized P/L and add comissions. EDavki does reporting based on Trade Price, not Cost Basis !!!
# The generated reports are going to show you made more money than you really did because Slovenia recognizes 1% of the Trade Price as the costs associated with buying/selling of the underlying.
def generateDataFrameReport(
    reportConfig: tc.TaxAuthorityConfiguration, data: Sequence[pgf.UnderlyingGrouping], countedProcessor: CountedGroupingProcessor
) -> pd.DataFrame:
    convertedTrades = common.convertTradesToKdvpItems(reportConfig, data, countedProcessor)

    def getLinesFromData(
        entry: ss.EDavkiGenericTradeReportItem,
    ) -> list[pd.DataFrame]:

        def getLinesDataFromEvents(line: ss.EDavkiTradeReportSecurityLineEvent):
            lines = pd.DataFrame(line.Events)
            lines["ISIN"] = line.ISIN
            lines["Ticker"] = line.Code
            lines["HasForeignTax"] = entry.HasForeignTax
            lines["ForeignTax"] = entry.ForeignTax
            lines["ForeignTaxCountryID"] = entry.ForeignTransfer
            lines["ForeignTaxCountryName"] = entry.HasForeignTax

            return lines

        return list(map(getLinesDataFromEvents, entry.Items))

    mappedData = list(map(getLinesFromData, convertedTrades))
    if len(mappedData) == 0:
        return pd.DataFrame()

    flattenedData = [x for xn in mappedData for x in xn]

    combinedData = pd.concat(flattenedData)  # type: ignore

    return combinedData
