import os

import arrow

import BrokerageExportProviders.Brokerages.IBKR.IbkrBrokerageExportProvider as ibrk
import Core.StagingFinancialEvents.Services.StagingFinancialGroupingProcessor as sgp
import Core.StagingFinancialEvents.Utils.ProcessingUtils as pu
import TaxAuthorityProvider.Schemas.Configuration as cf
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.ReportTypes as rt
import TaxAuthorityProvider.TaxAuthorities.Slovenia.SlovenianTaxAuthorityProvider as tap
from ConfigurationProvider.Configuration import TaxPayerInfo, TaxPayerType

issueReportsDirectory = os.path.join(os.path.dirname(__file__), "Issues")


ibkrProvider = ibrk.IbkrBrokerageExportProvider()


class TestSloveniaIssues:
    def testDuplicatingTrades(self):
        events = ibkrProvider.getBrokerEventsForReport(os.path.join(issueReportsDirectory, "DuplicatingTrades.xml"))
        convertedCommonFormat = ibkrProvider.transformBrokerEventsToBrokerAgnosticEvents(events)
        groupingProcessor = sgp.StagingFinancialGroupingProcessor(pu.ProcessingUtils())
        converted = groupingProcessor.generateGenericGroupings(convertedCommonFormat)

        taxPayerInfo = TaxPayerInfo(
            taxNumber="1234567890",
            taxpayerType=TaxPayerType.PHYSICAL_SUBJECT,
            name="John Doe",
            address1="123 Main St",
            address2="Apt 1",
            city="Anytown",
            postNumber="12345",
            postName="Post Office",
            municipalityName="Anytown Municipality",
            birthDate=arrow.get("1990-01-01"),
            maticnaStevilka="1234567890",
            invalidskoPodjetje=False,
            resident=True,
            activityCode="1234567890",
            activityName="Anytown Activity",
            countryID="US",
            countryName="United States",
        )

        reportconfig = cf.TaxAuthorityConfiguration(
            fromDate=arrow.get("2024"), toDate=arrow.get("2025"), lotMatchingMethod=cf.TaxAuthorityLotMatchingMethod.FIFO
        )

        provider = tap.SlovenianTaxAuthorityProvider(taxPayerInfo=taxPayerInfo, reportConfig=reportconfig)

        tradeCsv = provider.generateSpreadsheetExport(reportType=rt.SlovenianTaxAuthorityReportTypes.DOH_KDVP, data=converted)

        # Issue:
        # 2024-07-19 -> 10
        # 2024-07-22 -> 90 -> this one was duplicated, because it matched with two sells and the original quantity was taken
        # 2024-08-19 -> 100
        # 2024-10-01 -> -50
        # 2024-10-01 -> -50
        # 2024-10-02 -> -100
        # 2024-11-26 -> 10 -> has no matching lot, which is ok

        assert (
            tradeCsv.shape[0] == 8
        ), "Expected 8 rows, as there are 3 buys and 3 sells, but 2 of the buys are smaller than a single sell, so there are 4 matching lots"

        assert tradeCsv["Quantity"][0] == 10  # 2024-07-19 (10) -> 2024-10-01 (-50) = 2024-07-19 (0) -> 2024-10-01 (-40)
        assert tradeCsv["Quantity"][1] == 40  # 2024-07-22 (90) -> 2024-10-01 (-50) = 2024-07-22 (50) -> 2024-10-01 (0)
        assert tradeCsv["Quantity"][2] == 50  # 2024-08-19 (100) -> 2024-10-01 (-50) = 2024-08-19 (50) -> 2024-10-01 (0)
        assert tradeCsv["Quantity"][3] == 100  # 2024-10-01 (100) -> 2024-10-02 (-100) = 2024-10-01 (0) -> 2024-10-02 (0)
        assert tradeCsv["Quantity"][4] == -10
        assert tradeCsv["Quantity"][5] == -40
        assert tradeCsv["Quantity"][6] == -50
        assert tradeCsv["Quantity"][7] == -100
