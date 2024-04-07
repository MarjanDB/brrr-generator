from lxml import etree
import pandas as pd
from abc import abstractmethod
from typing import TypeVar, Generic, Sequence
import src.ConfigurationProvider.Configuration as conf
import src.InfoProviders.InfoLookupProvider as ilp
import src.ReportingStrategies.GenericFormats as gf
import src.ReportingStrategies.GenericUtilities as gu

from src.ConfigurationProvider.Configuration import ReportBaseConfig


INPUT_DATA = TypeVar('INPUT_DATA')
REPORT_CONFIG = TypeVar('REPORT_CONFIG')

class GenericReportWrapper:
    taxPayerInfo: conf.TaxPayerInfo
    baseReportConfig: ReportBaseConfig

    def __init__(self, taxPayerInfo: conf.TaxPayerInfo, baseReportConfig: ReportBaseConfig):
        self.taxPayerInfo = taxPayerInfo
        self.baseReportConfig = baseReportConfig

    @abstractmethod
    def createReportEnvelope(self):
        ...
    

class GenericReportProvider(GenericReportWrapper, Generic[REPORT_CONFIG]):
    companyLookupProvider = ilp.CompanyLookupProvider()
    countryLookupProvider = ilp.CountryLookupProvider()
    gUtils = gu.GenericUtilities()

    def __init__(self, taxPayerInfo: conf.TaxPayerInfo, reportConfig: REPORT_CONFIG) -> None:
        super().__init__(taxPayerInfo, reportConfig)


    @abstractmethod
    def generateXmlReport(self, data: Sequence[gf.UnderlyingGrouping], templateEnvelope: etree.ElementBase) -> etree.ElementBase:
        ...

    @abstractmethod
    def generateDataFrameReport(self, data: list[gf.UnderlyingGrouping]) -> pd.DataFrame:
        ...



class GenericDividendReport(GenericReportProvider[REPORT_CONFIG], Generic[REPORT_CONFIG]):
    ...


class GenericTradesReport(GenericReportProvider[REPORT_CONFIG], Generic[REPORT_CONFIG]):
    ...


class GenericDerivativeReport(GenericReportProvider[REPORT_CONFIG], Generic[REPORT_CONFIG]):
    ...