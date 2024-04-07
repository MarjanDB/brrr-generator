import json
import os
from enum import Enum

import pycountry as pc
import yfinance as yf

rootOfProject = os.getcwd()
cacheDir = os.path.join(rootOfProject, "cache", "yfinance")
yf.set_tz_cache_location(cacheDir)


class TreatyType(str, Enum):
    TaxRelief = "TAX_RELIEF"


class Country:
    name: str
    shortCode2: str
    treaties: dict[TreatyType, str]
    # https://www.gov.si/drzavni-organi/ministrstva/ministrstvo-za-finance/o-ministrstvu/direktorat-za-sistem-davcnih-carinskih-in-drugih-javnih-prihodkov/seznam-veljavnih-konvencij-o-izogibanju-dvojnega-obdavcevanja-dohodka-in-premozenja/
    # https://www.fu.gov.si/davki_in_druge_dajatve/podrocja/mednarodno_obdavcenje/#c78

    def __init__(self, name: str, shortCode2: str, treaties: dict[TreatyType, str]):
        self.name = name
        self.shortCode2 = shortCode2
        self.treaties = treaties


class CountryLookupProvider:
    problematicCountryMappings: dict[str, str]

    def __init__(self):
        definitionsPath = os.path.join(
            os.getcwd(), "src", "InfoProviders", "internationalTreaties.json"
        )
        problematicCountryMappingsFile = os.path.join(
            os.getcwd(), "src", "InfoProviders", "specialCountryMappings.json"
        )

        with open(definitionsPath, "r") as read_file:
            self.definitions = json.load(read_file)

        with open(problematicCountryMappingsFile, "r") as read_file:
            self.problematicCountryMappings = json.load(read_file)

    def getCountry(self, country: str) -> Country:
        if self.problematicCountryMappings.get(country) is None:
            countryDefinition = pc.countries.get(name=country)
            shortCode = countryDefinition.alpha_2
        else:
            shortCode = self.problematicCountryMappings[country]

        definedTreaties = dict(self.definitions["treaties"]["taxRelief"])
        thisCountryTreaties: dict[TreatyType, str] = {}

        if definedTreaties.get(shortCode) is not None:
            thisCountryTreaties[TreatyType.TaxRelief] = str(definedTreaties[shortCode])

        return Country(country, shortCode, thisCountryTreaties)


countryLookupInstance = CountryLookupProvider()


class CompanyLocationInfo:
    Country: str
    Address1: str
    Address2: str | None
    ZipCode: str
    City: str
    State: str | None

    ShortCodeCountry2: str

    def __init__(
        self,
        country: str,
        address1: str,
        address2: str | None,
        zipCode: str,
        city: str,
        state: str | None,
    ):
        self.Country = country
        self.Address1 = address1
        self.Address2 = address2
        self.ZipCode = zipCode
        self.City = city
        self.State = state

        countryDefinition = countryLookupInstance.getCountry(country)

        self.ShortCodeCountry2 = countryDefinition.shortCode2

    def formatAsUnternationalAddress(self) -> str:
        startingAddress = "{},".format(self.Address1)
        if self.Address2 is not None:
            startingAddress = "{}, {},".format(self.Address1, self.Address2)

        address = "{} {},".format(startingAddress, self.City)

        if self.State is not None:
            address = "{} {}".format(address, self.State)

        address = "{} {}, {}".format(address, self.ZipCode, self.Country)

        return address


class CompanyInfo:
    Location: CompanyLocationInfo
    ShortName: str
    LongName: str

    def __init__(self, shortName: str, longName: str, location: CompanyLocationInfo):
        self.ShortName = shortName
        self.LongName = longName
        self.Location = location


class CompanyLookupProvider:
    mappings: dict[str, yf.Ticker] = dict()
    isinToTickerLookup: dict[str, str]
    isinToCompanyLookup: dict[str, dict[str, str]]

    def __init__(self):
        definitionsPath = os.path.join(
            os.getcwd(), "src", "InfoProviders", "missingISINLookup.json"
        )

        with open(definitionsPath, "r") as read_file:
            self.isinToTickerLookup = dict(json.load(read_file))

        definitionsPath = os.path.join(
            os.getcwd(), "src", "InfoProviders", "missingCompaniesLookup.json"
        )

        with open(definitionsPath, "r") as read_file:
            self.isinToCompanyLookup = dict(json.load(read_file))

    def getCompanyInfo(self, isin: str) -> CompanyInfo:
        try:
            yfinanceTicker = self.getInfoByISIN(isin)
            companyInfo = yfinanceTicker.info
            if companyInfo.values().__len__() == 0:
                raise ValueError("Empty Company Data for ISIN ({})".format(isin))
        except Exception:
            print(
                "Failed online lookup of ISIN ({}), falling back to hardcoded company definitions".format(
                    isin
                )
            )

            if self.isinToCompanyLookup.get(isin) is None:
                raise ValueError("Failed lookup of ISIN ({})".format(isin))

            companyInfo = self.isinToCompanyLookup[isin]

        address1 = companyInfo.get("address1")
        address2 = companyInfo.get("address2")
        city = companyInfo.get("city")
        state = companyInfo.get("state")
        zipCode = companyInfo.get("zip")
        country = companyInfo.get("country")
        locationInfo = CompanyLocationInfo(
            country, address1, address2, zipCode, city, state
        )

        shortName = companyInfo.get("shortName")
        longName = companyInfo.get("longName")
        company = CompanyInfo(shortName, longName, locationInfo)
        return company

    def getInfoByTicker(self, ticker: str) -> yf.Ticker:
        if self.mappings.get(ticker) is not None:
            return self.mappings[ticker]

        lookUp = yf.Ticker(ticker)
        self.mappings[ticker] = lookUp
        return lookUp

    def getInfoByISIN(self, isin: str) -> yf.Ticker:
        try:
            return self.getInfoByTicker(isin)
        except Exception as e:
            print(
                "Failed lookup using ISIN ({}), trying again with ISIN mapping if exists".format(
                    isin
                )
            )
            print("Cause: {}".format(e))

        if self.isinToTickerLookup.get(isin) is None:
            raise ValueError("ISIN {} has no mapping to fall back on".format(isin))

        return self.getInfoByTicker(self.isinToTickerLookup[isin])
