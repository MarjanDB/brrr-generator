from enum import Enum
from arrow import Arrow
from dataclasses import dataclass

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

@dataclass
class ReportBaseConfig:
    fromDate: Arrow
    toDate: Arrow