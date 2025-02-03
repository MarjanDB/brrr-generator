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
        print(tradeCsv)

        # Issue:
        # 2024-07-19 -> 10
        # 2024-07-22 -> 90 -> this one is duplicated
        # 2024-08-19 -> 100
        # 2024-10-01 -> -100
        # 2024-10-02 -> -100
        # 2024-11-26 -> 10
