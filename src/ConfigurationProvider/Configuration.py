import os
from dataclasses import dataclass
from enum import Enum

import arrow
import yaml
from arrow import Arrow


class TaxPayerType(str, Enum):
    PHYSICAL_SUBJECT = "FO"
    LAW_SUBJECT = "PO"
    PHYSICAL_SUBJECT_WITH_ACTIVITY = "SP"


@dataclass
class TaxPayerInfo:
    taxNumber: str
    taxpayerType: TaxPayerType
    name: str
    address1: str
    address2: str | None
    city: str
    postNumber: str
    postName: str
    municipalityName: str
    birthDate: Arrow
    maticnaStevilka: str
    invalidskoPodjetje: bool
    resident: bool
    activityCode: str
    activityName: str
    countryID: str
    countryName: str


class ConfigurationProvider:
    generatedConfig: TaxPayerInfo

    def __init__(self, configurationDirectory: str):
        targetConfig = os.path.join(configurationDirectory, "userConfig.yml")

        with open(targetConfig, "r") as file:
            tempInfo: dict[str, str] = yaml.safe_load(file)

        self.generatedConfig = TaxPayerInfo(
            taxNumber=str(tempInfo.get("taxNumber") or "Tax #"),
            taxpayerType=TaxPayerType(tempInfo.get("taxPayerType") or TaxPayerType.PHYSICAL_SUBJECT),
            name=str(tempInfo.get("name") or "Ime Priimek"),
            address1=str(tempInfo.get("address1") or "Naslov"),
            address2=tempInfo.get("address2"),
            city=str(tempInfo.get("city") or "City"),
            postNumber=str(tempInfo.get("postOfficeNumber") or "Post Office #"),
            postName=str(tempInfo.get("postOfficeName") or "Post Office Name"),
            municipalityName=str(tempInfo.get("municipality") or "Municipality"),
            birthDate=(arrow.get(tempInfo.get("birthday") or "") if tempInfo.get("birthday") is not None else Arrow.now()),
            maticnaStevilka=str(tempInfo.get("identity") or "Identify #"),
            invalidskoPodjetje=bool(tempInfo.get("company") or False),
            resident=bool(tempInfo.get("resident") or True),
            activityCode="",
            activityName="",
            countryID="SI",
            countryName="Slovenia",
        )

    def getConfig(self) -> TaxPayerInfo:
        return self.generatedConfig
