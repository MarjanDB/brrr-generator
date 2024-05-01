from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Generic, Sequence, TypeVar

import pandas as pd

import ConfigurationProvider.Configuration as conf
import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import InfoProviders.InfoLookupProvider as ilp
import TaxAuthorityProvider.Schemas.Configuration as tapc
from AppModule import appInjector
from Core.FinancialEvents.GroupingProcessor.CountedGroupingProcessor import (
    CountedGroupingProcessor,
)

REPORT_CONFIG = TypeVar("REPORT_CONFIG", bound=tapc.TaxAuthorityConfiguration)
TAX_PAYER_CONFIG = TypeVar("TAX_PAYER_CONFIG", bound=conf.TaxPayerInfo)

TAX_AUTHORITY_REPORT = TypeVar("TAX_AUTHORITY_REPORT", bound=Enum)


class GenericTaxAuthorityProvider(ABC, Generic[REPORT_CONFIG, TAX_PAYER_CONFIG, TAX_AUTHORITY_REPORT]):
    taxPayerInfo: TAX_PAYER_CONFIG
    reportConfig: REPORT_CONFIG

    companyLookupProvider: ilp.CompanyLookupProvider
    countryLookupProvider: ilp.CountryLookupProvider
    countedGroupingProcessor: CountedGroupingProcessor

    def __init__(self, taxPayerInfo: TAX_PAYER_CONFIG, reportConfig: REPORT_CONFIG):
        self.taxPayerInfo = taxPayerInfo
        self.reportConfig = reportConfig
        self.companyLookupProvider = appInjector.inject(ilp.CompanyLookupProvider)
        self.countryLookupProvider = appInjector.inject(ilp.CountryLookupProvider)
        self.countedGroupingProcessor = appInjector.inject(CountedGroupingProcessor)

    @abstractmethod
    def generateExportForTaxAuthority(self, reportType: TAX_AUTHORITY_REPORT, data: Sequence[pgf.UnderlyingGrouping]) -> Any:
        """
        The reportType argument represents a report type to be generated.
        The data argument is the UnderlyingGrouping that the report can be generated off of.
        The return should be a structure that can be saved.
        TODO: Perhaps add a layer of indirection where a type of ReportWrapper is returned, which will wrap around whatever is being used to hold/store the data (lxml, pandas, ...).
        """

    @abstractmethod
    def generateSpreadsheetExport(self, reportType: TAX_AUTHORITY_REPORT, data: Sequence[pgf.UnderlyingGrouping]) -> pd.DataFrame:
        """
        The reportType argument represents a report type to be generated.
        The data argument is the UnderlyingGrouping that the report can be generated off of.
        The return should be a DataFrame that can be used for validating reports using a spreadsheet program.
        """
