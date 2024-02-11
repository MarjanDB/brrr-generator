from lxml import etree
import pandas as pd
from abc import abstractmethod
from typing import TypeVar, Generic
import src.ConfigurationProvider.Configuration as conf
import src.InfoProviders.InfoLookupProvider as ilp
import src.ReportingStrategies.GenericFormats as gf

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
    

class GenericReportProvider(Generic[INPUT_DATA, REPORT_CONFIG]):
    companyLookupProvider = ilp.CompanyLookupProvider()
    countryLookupProvider = ilp.CountryLookupProvider()

    def __init__(self, reportConfig: REPORT_CONFIG, taxPayerInfo: conf.TaxPayerInfo) -> None:
        self.reportConfig = reportConfig
        self.taxPayerInfo = taxPayerInfo

    @abstractmethod
    def generateXmlReport(self, data: list[INPUT_DATA], templateEnvelope: etree.ElementBase) -> etree.ElementBase:
        ...

    @abstractmethod
    def generateDataFrameReport(self, data: list[INPUT_DATA],) -> pd.DataFrame:
        ...



class GenericDividendReport(GenericReportProvider[gf.GenericDividendLine, REPORT_CONFIG]):
    ...


class GenericTradesReport(GenericReportProvider[gf.GenericTradeReportItem, REPORT_CONFIG]):
    ...