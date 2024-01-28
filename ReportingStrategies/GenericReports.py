from lxml import etree
import pandas as pd
from abc import abstractmethod
from typing import TypeVar, Generic
from Common.Configuration import TaxPayerInfo
from Common.Configuration import ReportBaseConfig
from InfoProviders.InfoLookupProvider import CompanyLookupProvider
from InfoProviders.InfoLookupProvider import CountryLookupProvider
from ReportingStrategies.GenericFormats import GenericDividendLine
from ReportingStrategies.GenericFormats import GenericTradeReportItem



INPUT_DATA = TypeVar('INPUT_DATA')
REPORT_CONFIG = TypeVar('REPORT_CONFIG')


class GenericReportWrapper:
    taxPayerInfo: TaxPayerInfo

    def __init__(self, taxPayerInfo: TaxPayerInfo):
        self.taxPayerInfo = taxPayerInfo

    @abstractmethod
    def createReportEnvelope(self):
        ...
    

class GenericReportProvider(Generic[INPUT_DATA]):
    companyLookupProvider = CompanyLookupProvider()
    countryLookupProvider = CountryLookupProvider()

    def __init__(self, reportConfig: ReportBaseConfig, taxPayerInfo: TaxPayerInfo) -> None:
        self.reportConfig = reportConfig
        self.taxPayerInfo = taxPayerInfo

    @abstractmethod
    def generateXmlReport(self, data: list[INPUT_DATA], templateEnvelope: etree.ElementBase) -> etree.ElementBase:
        ...

    @abstractmethod
    def generateDataFrameReport(self, data: list[INPUT_DATA],) -> pd.DataFrame:
        ...



class GenericDividendReport(GenericReportProvider[GenericDividendLine]):
    ...


class GenericTradesReport(GenericReportProvider[GenericTradeReportItem]):
    ...