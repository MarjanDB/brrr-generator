import ReportingStrategies.Common.Dividend as d
from InfoProviders.CompanyLookupProvider import CompanyLookupProvider
from InfoProviders.CompanyLookupProvider import CountryLookupProvider
from InfoProviders.CompanyLookupProvider import TreatyType
import pycountry as pc
import pandas as pd

class DividendsReport:

    dividends: list[d.DividendLine] = list()
    witheldTax: list[d.WitholdingTaxLine] = list()
    companyLookupProvider = CompanyLookupProvider()
    countryLookupProvider = CountryLookupProvider()


    def __init__(self, dividends: list[d.DividendLine], witheldTax: list[d.WitholdingTaxLine]):
        self.dividends = dividends
        self.witheldTax = witheldTax


    def getDividendReport(self) -> list[d.DividendReportLine]:

        # First generate basic report lines from dividends
        actionToDividendMapping : dict[str, d.DividendReportLine] = dict()

        for dividend in self.dividends:
            actionId = dividend.DividendActionID

            if actionToDividendMapping.get(actionId) is None:
                actionToDividendMapping[actionId] = d.DividendReportLine()

            reportLine = actionToDividendMapping[actionId]

            reportLine.DividendAmount += dividend.getAmountInBaseCurrency()
            reportLine.DateReceived = dividend.DividendReceivedDateTime
            reportLine.DividendType = dividend.DividendType

            reportLine.DividendIdentifierForTracking = actionId
            
            try:
                responsibleCompany = self.companyLookupProvider.getCompanyInfo(dividend.SecurityISIN)

                reportLine.DividendPayerTitle = responsibleCompany.LongName

                reportLine.DividendPayerCountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2
                reportLine.CountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2

                reportLine.DividendPayerAddress = responsibleCompany.Location.formatAsUnternationalAddress()

                relevantCountry = self.countryLookupProvider.getCountry(responsibleCompany.Location.Country)
                treaty = relevantCountry.treaties.get(TreatyType.TaxRelief)

                reportLine.TaxReliefParagraphInInternationalTreaty = treaty

            except Exception as e:
                print("Failed for ISIN: " + dividend.SecurityISIN)
                

            # print(reportLine)


        for withheldTax in self.witheldTax:
            actionId = withheldTax.TaxActionID

            if actionToDividendMapping.get(actionId) is None:
                actionToDividendMapping[actionId] = d.DividendReportLine()

            reportLine = actionToDividendMapping[actionId]

            reportLine.ForeignTaxPaid += withheldTax.getAmountInBaseCurrency()
            reportLine.DateReceived = withheldTax.WitholdingTaxReceivedDateTime

            reportLine.DividendIdentifierForTracking = actionId

            try:
                responsibleCompany = self.companyLookupProvider.getCompanyInfo(withheldTax.SecurityISIN)

                reportLine.DividendPayerTitle = responsibleCompany.LongName

                reportLine.DividendPayerCountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2
                reportLine.CountryOfOrigin = responsibleCompany.Location.ShortCodeCountry2

                reportLine.DividendPayerAddress = responsibleCompany.Location.formatAsUnternationalAddress()

                relevantCountry = self.countryLookupProvider.getCountry(responsibleCompany.Location.Country)
                treaty = relevantCountry.treaties.get(TreatyType.TaxRelief)
                
                reportLine.TaxReliefParagraphInInternationalTreaty = treaty

            except Exception as e:
                print("Failed for ISIN: " + withheldTax.SecurityISIN)

        createdLines = list(actionToDividendMapping.values())
        return createdLines
            

    def getDividentReportDataFrame(self) -> pd.DataFrame:
        data = self.getDividendReport()

        def convertToDict(data : d.DividendReportLine):
            converted = {
                'Datum prejema dividend': data.DateReceived.format("DD. MM. YYYY."),
                'Davčna številka izplačevalca dividend': data.TaxNumberForDividendPayer,
                'Identifikacijska številka izplačevalca dividend': data.DividendPayerIdentificationNumber,
                'Naziv izplačevalca dividend': data.DividendPayerTitle,
                'Naslov izplačevalca dividend': data.DividendPayerAddress,
                'Država izplačevalca dividend': data.DividendPayerCountryOfOrigin,
                'Šifra vrste dividend': data.DividendType.value,
                'Znesek dividend (v EUR)': data.DividendAmount.__round__(2),
                'Tuji davek (v EUR)': data.ForeignTaxPaid.__round__(2),
                'Država vira': data.CountryOfOrigin,
                'Uveljavljam oprostitev po mednarodni pogodbi': data.TaxReliefParagraphInInternationalTreaty,
                'Action Tracking': data.DividendIdentifierForTracking
            }
            return converted
        
        dataAsDict = list(map(convertToDict, data))

        dataframe = pd.DataFrame.from_records(dataAsDict)

        return dataframe

