from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Generic, TypeVar

import pandas as pd

import ConfigurationProvider.Configuration as conf
import Core.FinancialEvents.Schemas.FinancialEvents as pfe
import InfoProviders.InfoLookupProvider as ilp
import TaxAuthorityProvider.Schemas.Configuration as tapc
from AppModule import appInjector
from Core.FinancialEvents.Services.ApplyIdentifierRelationshipsService import (
    ApplyIdentifierRelationshipsService,
)
from Core.FinancialEvents.Services.FinancialEventsProcessor import (
    FinancialEventsProcessor,
)

REPORT_CONFIG = TypeVar("REPORT_CONFIG", bound=tapc.TaxAuthorityConfiguration)
TAX_PAYER_CONFIG = TypeVar("TAX_PAYER_CONFIG", bound=conf.TaxPayerInfo)
TAX_AUTHORITY_REPORT = TypeVar("TAX_AUTHORITY_REPORT", bound=Enum)
REPORT_DATA = TypeVar("REPORT_DATA")


class GenericTaxAuthorityProvider(ABC, Generic[REPORT_CONFIG, TAX_PAYER_CONFIG, TAX_AUTHORITY_REPORT, REPORT_DATA]):
    taxPayerInfo: TAX_PAYER_CONFIG
    reportConfig: REPORT_CONFIG

    companyLookupProvider: ilp.CompanyLookupProvider
    countryLookupProvider: ilp.CountryLookupProvider
    countedGroupingProcessor: FinancialEventsProcessor
    applyIdentifierRelationshipsService: ApplyIdentifierRelationshipsService

    def __init__(self, taxPayerInfo: TAX_PAYER_CONFIG, reportConfig: REPORT_CONFIG):
        self.taxPayerInfo = taxPayerInfo
        self.reportConfig = reportConfig
        self.companyLookupProvider = appInjector.inject(ilp.CompanyLookupProvider)
        self.countryLookupProvider = appInjector.inject(ilp.CountryLookupProvider)
        self.countedGroupingProcessor = appInjector.inject(FinancialEventsProcessor)
        self.applyIdentifierRelationshipsService = appInjector.inject(ApplyIdentifierRelationshipsService)

    @abstractmethod
    def generateReportData(self, reportType: TAX_AUTHORITY_REPORT, events: pfe.FinancialEvents) -> REPORT_DATA:
        """
        Returns the report in the tax authority's own data types (after applying identifier
        relationships), for inspection or passing to export builders.
        """

    @abstractmethod
    def generateExportForTaxAuthority(self, reportType: TAX_AUTHORITY_REPORT, events: pfe.FinancialEvents) -> Any:
        """
        The reportType argument represents a report type to be generated.
        The events argument is the core financial events (groupings and identifier relationships).
        The provider applies identifier relationships (e.g. renames) as needed, then generates the report.
        The return should be a structure that can be saved.
        TODO: Perhaps add a layer of indirection where a type of ReportWrapper is returned, which will wrap around whatever is being used to hold/store the data (lxml, pandas, ...).
        """

    @abstractmethod
    def generateSpreadsheetExport(self, reportType: TAX_AUTHORITY_REPORT, events: pfe.FinancialEvents) -> pd.DataFrame:
        """
        The reportType argument represents a report type to be generated.
        The events argument is the core financial events (groupings and identifier relationships).
        The provider applies identifier relationships as needed, then generates the spreadsheet export.
        The return should be a DataFrame that can be used for validating reports using a spreadsheet program.
        """
