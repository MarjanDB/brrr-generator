from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Generic, Sequence, TypeVar

import pandas as pd
from lxml import etree

import src.ConfigurationProvider.Configuration as conf
import src.InfoProviders.InfoLookupProvider as ilp
import src.TaxAuthorityProvider.Schemas.GenericFormats as gf
import src.TaxAuthorityProvider.Utils.GenericUtilities as gu
import TaxAuthorityProvider.Schemas.Configuration as tapc

REPORT_CONFIG = TypeVar("REPORT_CONFIG", bound=tapc.TaxAuthorityConfiguration)
TAX_PAYER_CONFIG = TypeVar("TAX_PAYER_CONFIG", bound=conf.TaxPayerInfo)

TAX_AUTHORITY_REPORT = TypeVar("TAX_AUTHORITY_REPORT", bound=Enum)


class GenericTaxAuthorityProvider(ABC, Generic[REPORT_CONFIG, TAX_PAYER_CONFIG, TAX_AUTHORITY_REPORT]):
    taxPayerInfo: TAX_PAYER_CONFIG
    reportConfig: REPORT_CONFIG

    companyLookupProvider = ilp.CompanyLookupProvider()
    countryLookupProvider = ilp.CountryLookupProvider()
    gUtils = gu.GenericUtilities()

    def __init__(self, taxPayerInfo: TAX_PAYER_CONFIG, reportConfig: REPORT_CONFIG):
        self.taxPayerInfo = taxPayerInfo
        self.reportConfig = reportConfig

    @abstractmethod
    def generateExportForTaxAuthority(self, reportType: TAX_AUTHORITY_REPORT, data: Sequence[gf.UnderlyingGrouping]) -> Any:
        """
        The reportType argument represents a report type to be generated.
        The data argument is the UnderlyingGrouping that the report can be generated off of.
        The return should be a structure that can be saved.
        TODO: Perhaps add a layer of indirection where a type of ReportWrapper is returned, which will wrap around whatever is being used to hold/store the data (lxml, pandas, ...).
        """

    @abstractmethod
    def generateSpreadsheetExport(self, reportType: TAX_AUTHORITY_REPORT, data: Sequence[gf.UnderlyingGrouping]) -> pd.DataFrame:
        """
        The reportType argument represents a report type to be generated.
        The data argument is the UnderlyingGrouping that the report can be generated off of.
        The return should be a DataFrame that can be used for validating reports using a spreadsheet program.
        """


class GenericReportWrapper:
    taxPayerInfo: conf.TaxPayerInfo
    baseReportConfig: tapc.TaxAuthorityConfiguration

    def __init__(self, taxPayerInfo: conf.TaxPayerInfo, baseReportConfig: tapc.TaxAuthorityConfiguration):
        self.taxPayerInfo = taxPayerInfo
        self.baseReportConfig = baseReportConfig

    @abstractmethod
    def createReportEnvelope(self): ...


class GenericReportProvider(GenericReportWrapper, Generic[REPORT_CONFIG]):
    companyLookupProvider = ilp.CompanyLookupProvider()
    countryLookupProvider = ilp.CountryLookupProvider()
    gUtils = gu.GenericUtilities()

    def __init__(self, taxPayerInfo: conf.TaxPayerInfo, reportConfig: REPORT_CONFIG) -> None:
        super().__init__(taxPayerInfo, reportConfig)

    @abstractmethod
    def generateXmlReport(self, data: Sequence[gf.UnderlyingGrouping], templateEnvelope: etree.ElementBase) -> etree.ElementBase: ...

    @abstractmethod
    def generateDataFrameReport(self, data: list[gf.UnderlyingGrouping]) -> pd.DataFrame: ...


class GenericDividendReport(GenericReportProvider[REPORT_CONFIG], Generic[REPORT_CONFIG]): ...


class GenericTradesReport(GenericReportProvider[REPORT_CONFIG], Generic[REPORT_CONFIG]): ...


class GenericDerivativeReport(GenericReportProvider[REPORT_CONFIG], Generic[REPORT_CONFIG]): ...
